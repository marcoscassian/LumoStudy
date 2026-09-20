from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import case, func
from sqlmodel import Session, select

from database.db import get_session
from models.models import (
    Area,
    CronogramaAtividade,
    CronogramaPreferencia,
    Questao,
    RespostaUsuario,
)
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/cronograma", tags=["cronograma"])

PERIODOS_VALIDOS = ("manha", "tarde", "noite")
ROTULOS_PERIODO = {
    "manha": "Manhã",
    "tarde": "Tarde",
    "noite": "Noite",
}
QUANTIDADES_QUESTOES = (5, 10, 15, 20)


class ConfiguracaoCronogramaPayload(BaseModel):
    horas_por_dia: float = Field(ge=1, le=10)
    periodos: list[str] = Field(min_length=1, max_length=3)

    @field_validator("periodos")
    @classmethod
    def validar_periodos(cls, valores: list[str]) -> list[str]:
        normalizados: list[str] = []
        for valor in valores:
            periodo = valor.strip().lower()
            if periodo not in PERIODOS_VALIDOS:
                raise ValueError("Use apenas manha, tarde e/ou noite")
            if periodo not in normalizados:
                normalizados.append(periodo)
        if not normalizados:
            raise ValueError("Escolha ao menos um período do dia")
        return normalizados


class ConcluirAtividadePayload(BaseModel):
    concluida: bool = True


def _preferencia_usuario(session: Session, usuario_id: int) -> CronogramaPreferencia:
    preferencia = session.exec(
        select(CronogramaPreferencia).where(CronogramaPreferencia.usuario_id == usuario_id)
    ).first()
    if preferencia:
        return preferencia

    preferencia = CronogramaPreferencia(
        usuario_id=usuario_id,
        minutos_por_dia=120,
        manha=False,
        tarde=True,
        noite=False,
    )
    session.add(preferencia)
    session.commit()
    session.refresh(preferencia)
    return preferencia


def _periodos_preferencia(preferencia: CronogramaPreferencia) -> list[str]:
    periodos = []
    if preferencia.manha:
        periodos.append("manha")
    if preferencia.tarde:
        periodos.append("tarde")
    if preferencia.noite:
        periodos.append("noite")
    return periodos or ["tarde"]


def _estatisticas_areas(session: Session, usuario_id: int, areas: list[Area]) -> list[dict]:
    stmt = (
        select(
            Questao.area_id,
            func.count(RespostaUsuario.id),
            func.sum(case((RespostaUsuario.correta == True, 1), else_=0)),  # noqa: E712
        )
        .join(RespostaUsuario, RespostaUsuario.questao_id == Questao.id)
        .where(RespostaUsuario.usuario_id == usuario_id)
        .group_by(Questao.area_id)
    )
    linhas = session.exec(stmt).all()
    por_area = {
        int(area_id): {
            "respondidas": int(total or 0),
            "corretas": int(corretas or 0),
        }
        for area_id, total, corretas in linhas
    }

    resultado = []
    for area in areas:
        stats = por_area.get(int(area.id or 0), {"respondidas": 0, "corretas": 0})
        total = stats["respondidas"]
        corretas = stats["corretas"]
        aproveitamento = round((corretas / total) * 100) if total else None

        # Áreas ainda não praticadas recebem prioridade alta para o cronograma
        # não ignorar conteúdos que o usuário nunca treinou.
        if total == 0:
            score_prioridade = 0.72
        else:
            score_prioridade = 1 - (corretas / total)
            if total < 10:
                score_prioridade += 0.08

        resultado.append(
            {
                "id": area.id,
                "slug": area.slug,
                "nome": area.nome,
                "respondidas": total,
                "corretas": corretas,
                "aproveitamento": aproveitamento,
                "score_prioridade": score_prioridade,
            }
        )

    resultado.sort(
        key=lambda item: (
            -item["score_prioridade"],
            item["aproveitamento"] if item["aproveitamento"] is not None else -1,
            item["nome"],
        )
    )
    return resultado


def _quantidade_questoes(duracao_minutos: int) -> int:
    estimada = max(5, min(20, duracao_minutos // 3))
    elegiveis = [qtd for qtd in QUANTIDADES_QUESTOES if qtd <= estimada]
    return max(elegiveis) if elegiveis else 5


def _bloco_questoes(area: dict, minutos: int) -> dict:
    quantidade = _quantidade_questoes(minutos)
    return {
        "tipo": "questoes",
        "area_id": area["id"],
        "titulo": f"Questões de {area['nome']}",
        "descricao": f"Resolva um bloco de {quantidade} questões. Você pode ajustar a quantidade antes de começar.",
        "duracao_minutos": minutos,
        "quantidade": quantidade,
        "rota": f"/trilha?area={area['slug']}&quantidade={quantidade}",
    }


def _bloco_flashcards(area: dict, minutos: int) -> dict:
    return {
        "tipo": "flashcards",
        "area_id": area["id"],
        "titulo": "Revisão com flashcards",
        "descricao": (
            f"Revise os flashcards disponíveis por {minutos} minutos, dando preferência a conteúdos de "
            f"{area['nome']} e aos cartões que precisam de mais revisão."
        ),
        "duracao_minutos": minutos,
        "quantidade": None,
        "rota": "/flashcards",
    }


def _bloco_simulado(minutos: int, quantidade: int, dia_prova: int) -> dict:
    return {
        "tipo": "simulado",
        "area_id": None,
        "titulo": f"Simulado ENEM — {quantidade} questões",
        "descricao": (
            f"Faça um simulado do Dia {dia_prova} com {quantidade} questões. "
            "Use o cronômetro e tente reproduzir o ritmo de prova, sem consultar respostas durante a sessão."
        ),
        "duracao_minutos": minutos,
        "quantidade": quantidade,
        "rota": f"/simulados?dia={dia_prova}&quantidade={quantidade}",
    }


def _montar_blocos_dia(total_minutos: int, indice_dia: int, areas_ordenadas: list[dict]) -> list[dict]:
    if not areas_ordenadas:
        return []

    # Ciclo propositalmente ponderado: as áreas de menor desempenho aparecem
    # mais vezes, mas todas continuam entrando ao longo da semana.
    n = len(areas_ordenadas)
    ciclo = [
        areas_ordenadas[0],
        areas_ordenadas[1 % n],
        areas_ordenadas[0],
        areas_ordenadas[2 % n],
        areas_ordenadas[1 % n],
        areas_ordenadas[3 % n],
    ]
    principal = ciclo[indice_dia % len(ciclo)]
    secundaria = ciclo[(indice_dia + 1) % len(ciclo)]

    simulados: dict[int, int] = {}
    if total_minutos >= 300:
        simulados = {2: 25, 6: 90}
    elif total_minutos >= 120:
        simulados = {3: 25, 6: 25}
    else:
        simulados = {6: 25}

    quantidade_simulado = simulados.get(indice_dia)
    if quantidade_simulado:
        dia_prova = 1 if indice_dia % 2 == 0 else 2
        if quantidade_simulado == 90:
            # Dia 2 do ENEM tem 5 horas; por isso o plano de 90 questões só é
            # usado quando o usuário declarou pelo menos 5 horas disponíveis.
            sim_minutos = min(300, total_minutos)
            blocos = [_bloco_simulado(sim_minutos, 90, 2)]
            restante = total_minutos - sim_minutos
            if restante >= 15:
                flash = min(30, restante)
                blocos.append(_bloco_flashcards(principal, flash))
                restante -= flash
            if restante >= 15:
                blocos.append(_bloco_questoes(secundaria, restante))
            return blocos

        sim_minutos = min(90, max(60, round(total_minutos * 0.65)))
        restante = total_minutos - sim_minutos
        blocos = [_bloco_simulado(sim_minutos, 25, dia_prova)]
        if restante >= 15:
            flash = min(max(15, round(total_minutos * 0.15)), restante)
            blocos.append(_bloco_flashcards(principal, flash))
            restante -= flash
        if restante >= 15:
            blocos.append(_bloco_questoes(secundaria, restante))
        elif restante > 0:
            # Minutos residuais são incorporados ao simulado para manter a soma
            # diária exatamente igual ao tempo informado pelo usuário.
            blocos[0]["duracao_minutos"] += restante
        return blocos

    flash_minutos = max(15, round(total_minutos * 0.20))
    if flash_minutos >= total_minutos:
        flash_minutos = max(10, total_minutos // 3)
    restante = total_minutos - flash_minutos

    blocos = [_bloco_flashcards(principal, flash_minutos)]
    if restante >= 70:
        primeiro = restante // 2
        segundo = restante - primeiro
        blocos.append(_bloco_questoes(principal, primeiro))
        blocos.append(_bloco_questoes(secundaria, segundo))
    else:
        blocos.append(_bloco_questoes(principal, restante))
    return blocos


def _gerar_cronograma(session: Session, usuario_id: int, preferencia: CronogramaPreferencia) -> None:
    hoje = date.today()
    fim = hoje + timedelta(days=6)

    existentes = session.exec(
        select(CronogramaAtividade).where(
            CronogramaAtividade.usuario_id == usuario_id,
            CronogramaAtividade.data >= hoje,
            CronogramaAtividade.data <= fim,
        )
    ).all()
    for atividade in existentes:
        session.delete(atividade)
    session.flush()

    areas = session.exec(select(Area).order_by(Area.ordem)).all()
    if not areas:
        session.commit()
        return

    areas_ordenadas = _estatisticas_areas(session, usuario_id, areas)
    periodos = _periodos_preferencia(preferencia)

    for indice_dia in range(7):
        data_atividade = hoje + timedelta(days=indice_dia)
        blocos = _montar_blocos_dia(preferencia.minutos_por_dia, indice_dia, areas_ordenadas)
        for ordem, bloco in enumerate(blocos, start=1):
            periodo = periodos[(ordem - 1) % len(periodos)]
            session.add(
                CronogramaAtividade(
                    usuario_id=usuario_id,
                    data=data_atividade,
                    periodo=periodo,
                    tipo=bloco["tipo"],
                    area_id=bloco["area_id"],
                    titulo=bloco["titulo"],
                    descricao=bloco["descricao"],
                    duracao_minutos=bloco["duracao_minutos"],
                    quantidade=bloco["quantidade"],
                    rota=bloco["rota"],
                    ordem=ordem,
                )
            )
    session.commit()


def _serializar_preferencia(preferencia: CronogramaPreferencia) -> dict:
    return {
        "horas_por_dia": preferencia.minutos_por_dia / 60,
        "minutos_por_dia": preferencia.minutos_por_dia,
        "periodos": _periodos_preferencia(preferencia),
        "atualizado_em": preferencia.atualizado_em,
    }


def _serializar_atividade(item: CronogramaAtividade, area_por_id: dict[int, Area]) -> dict:
    area = area_por_id.get(item.area_id)
    quantidade = item.quantidade
    descricao = item.descricao
    rota = item.rota

    if item.tipo == "questoes":
        quantidade = quantidade if quantidade in QUANTIDADES_QUESTOES else _quantidade_questoes(item.duracao_minutos)
        descricao = f"Resolva um bloco de {quantidade} questões. Você pode ajustar a quantidade antes de começar."
        rota = f"/trilha?area={area.slug}&quantidade={quantidade}" if area else "/trilha"
    elif item.tipo == "flashcards":
        nome_area = area.nome if area else "sua área de estudo"
        descricao = (
            f"Revise os flashcards disponíveis por {item.duracao_minutos} minutos, dando preferência a conteúdos de "
            f"{nome_area} e aos cartões que precisam de mais revisão."
        )

    return {
        "id": item.id,
        "periodo": item.periodo,
        "periodo_label": ROTULOS_PERIODO.get(item.periodo, item.periodo.title()),
        "tipo": item.tipo,
        "area": area.nome if area else None,
        "titulo": item.titulo,
        "descricao": descricao,
        "duracao_minutos": item.duracao_minutos,
        "quantidade": quantidade,
        "rota": rota,
        "concluida": item.concluida,
    }


def _resposta_cronograma(session: Session, usuario_id: int, preferencia: CronogramaPreferencia) -> dict:
    hoje = date.today()
    fim = hoje + timedelta(days=6)
    atividades = session.exec(
        select(CronogramaAtividade)
        .where(
            CronogramaAtividade.usuario_id == usuario_id,
            CronogramaAtividade.data >= hoje,
            CronogramaAtividade.data <= fim,
        )
        .order_by(CronogramaAtividade.data, CronogramaAtividade.ordem)
    ).all()

    areas = session.exec(select(Area).order_by(Area.ordem)).all()
    area_por_id = {area.id: area for area in areas}
    prioridades = _estatisticas_areas(session, usuario_id, areas)

    dias = []
    for deslocamento in range(7):
        dia = hoje + timedelta(days=deslocamento)
        itens = [item for item in atividades if item.data == dia]
        dias.append(
            {
                "data": dia,
                "total_minutos": sum(item.duracao_minutos for item in itens),
                "concluidas": sum(1 for item in itens if item.concluida),
                "total_atividades": len(itens),
                "atividades": [_serializar_atividade(item, area_por_id) for item in itens],
            }
        )

    return {
        "configuracao": _serializar_preferencia(preferencia),
        "dias": dias,
        "prioridades": [
            {
                "area": item["nome"],
                "slug": item["slug"],
                "respondidas": item["respondidas"],
                "corretas": item["corretas"],
                "aproveitamento": item["aproveitamento"],
            }
            for item in prioridades
        ],
        "gerado_em": datetime.now(),
    }


@router.get("")
def obter_cronograma(usuario: UsuarioLogado, session: SessionDep):
    preferencia = _preferencia_usuario(session, usuario.id)
    hoje = date.today()
    existe = session.exec(
        select(CronogramaAtividade.id).where(
            CronogramaAtividade.usuario_id == usuario.id,
            CronogramaAtividade.data >= hoje,
            CronogramaAtividade.data <= hoje + timedelta(days=6),
        )
    ).first()
    if not existe:
        _gerar_cronograma(session, usuario.id, preferencia)
    return _resposta_cronograma(session, usuario.id, preferencia)


@router.put("/configuracao")
def atualizar_configuracao(
    payload: ConfiguracaoCronogramaPayload,
    usuario: UsuarioLogado,
    session: SessionDep,
):
    preferencia = _preferencia_usuario(session, usuario.id)
    preferencia.minutos_por_dia = int(round(payload.horas_por_dia * 60))
    preferencia.manha = "manha" in payload.periodos
    preferencia.tarde = "tarde" in payload.periodos
    preferencia.noite = "noite" in payload.periodos
    preferencia.atualizado_em = datetime.now()
    session.add(preferencia)
    session.commit()
    session.refresh(preferencia)

    _gerar_cronograma(session, usuario.id, preferencia)
    return _resposta_cronograma(session, usuario.id, preferencia)


@router.post("/gerar")
def recalcular_cronograma(usuario: UsuarioLogado, session: SessionDep):
    preferencia = _preferencia_usuario(session, usuario.id)
    _gerar_cronograma(session, usuario.id, preferencia)
    return _resposta_cronograma(session, usuario.id, preferencia)


@router.patch("/atividades/{atividade_id}")
def concluir_atividade(
    atividade_id: int,
    payload: ConcluirAtividadePayload,
    usuario: UsuarioLogado,
    session: SessionDep,
):
    atividade = session.get(CronogramaAtividade, atividade_id)
    if not atividade or atividade.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Atividade do cronograma não encontrada")

    atividade.concluida = payload.concluida
    session.add(atividade)
    session.commit()
    session.refresh(atividade)
    return {"id": atividade.id, "concluida": atividade.concluida}
