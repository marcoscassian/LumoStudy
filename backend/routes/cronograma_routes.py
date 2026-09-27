from __future__ import annotations

import json
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
    inicio_hora: str = "13:00"
    fim_hora: str = "17:00"
    pausa_inicio: str | None = None
    pausa_fim: str | None = None
    dias_semana: list[int] = Field(default_factory=lambda: list(range(7)), min_length=1, max_length=7)
    prioridades: dict[str, int] = Field(default_factory=dict)
    rotina_semana: dict[int, dict] = Field(default_factory=dict)
    horas_por_dia: float | None = Field(default=None, ge=1, le=10)
    periodos: list[str] = Field(default_factory=lambda: ["tarde"], min_length=1, max_length=3)

    @field_validator("inicio_hora", "fim_hora", "pausa_inicio", "pausa_fim")
    @classmethod
    def validar_hora(cls, valor: str | None) -> str | None:
        if valor is None:
            return None
        try:
            datetime.strptime(valor, "%H:%M")
        except ValueError as exc:
            raise ValueError("Informe horários no formato HH:MM") from exc
        return valor

    @field_validator("dias_semana")
    @classmethod
    def validar_dias(cls, valores: list[int]) -> list[int]:
        if any(dia < 0 or dia > 6 for dia in valores):
            raise ValueError("Os dias da semana devem estar entre 0 e 6")
        return sorted(set(valores))

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
        inicio_hora="13:00",
        fim_hora="17:00",
        pausa_inicio=None,
        pausa_fim=None,
        dias_semana_json=json.dumps(list(range(7))),
        prioridades_json="{}",
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


def _minutos(hora: str) -> int:
    try:
        h, m = map(int, hora.split(":"))
        if h < 0 or h > 23 or m < 0 or m > 59:
            raise ValueError
        return h * 60 + m
    except (AttributeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Informe um horário válido no formato HH:MM.") from exc


def _duracao_estudo(preferencia: CronogramaPreferencia) -> int:
    total = _minutos(preferencia.fim_hora) - _minutos(preferencia.inicio_hora)
    if preferencia.pausa_inicio and preferencia.pausa_fim:
        total -= _minutos(preferencia.pausa_fim) - _minutos(preferencia.pausa_inicio)
    return total


def _rotina_preferencia(preferencia: CronogramaPreferencia) -> dict[int, dict]:
    if preferencia.rotina_semana_json:
        try:
            rotina = json.loads(preferencia.rotina_semana_json)
            return {int(dia): dados for dia, dados in rotina.items()}
        except (TypeError, ValueError):
            pass
    pausa = []
    if preferencia.pausa_inicio and preferencia.pausa_fim:
        pausa = [{"inicio": preferencia.pausa_inicio, "fim": preferencia.pausa_fim}]
    base = {"inicio": preferencia.inicio_hora, "fim": preferencia.fim_hora, "pausas": pausa}
    return {dia: base for dia in json.loads(preferencia.dias_semana_json or "[0,1,2,3,4,5,6]")}


def _duracao_rotina(rotina: dict) -> int:
    duracao = _minutos(rotina["fim"]) - _minutos(rotina["inicio"])
    return duracao - sum(_minutos(pausa["fim"]) - _minutos(pausa["inicio"]) for pausa in rotina.get("pausas", []))


def _segmentar_bloco(inicio: int, duracao: int, pausas: list[dict]) -> list[tuple[int, int]]:
    cursor = inicio
    restante = duracao
    partes = []
    for pausa in pausas:
        pausa_inicio = _minutos(pausa["inicio"])
        pausa_fim = _minutos(pausa["fim"])
        if pausa_fim <= cursor or pausa_inicio >= cursor + restante:
            continue
        if pausa_inicio > cursor:
            antes = pausa_inicio - cursor
            partes.append((cursor, antes))
            restante -= antes
        cursor = max(cursor, pausa_fim)
    if restante > 0:
        partes.append((cursor, restante))
    return partes


def _proximas_datas_de_estudo(preferencia: CronogramaPreferencia, quantidade: int = 7) -> list[date]:
    dias_escolhidos = set(json.loads(preferencia.dias_semana_json or "[0,1,2,3,4,5,6]"))
    datas = []
    data_atual = date.today()
    while len(datas) < quantidade:
        if data_atual.weekday() in dias_escolhidos:
            datas.append(data_atual)
        data_atual += timedelta(days=1)
    return datas


def _distribuir_por_prioridade(total: int, areas: list[dict], preferencias: dict[str, int]) -> list[tuple[dict, int]]:
    pesos = [max(0, int(preferencias.get(area["slug"], 0))) for area in areas]
    if len(pesos) != 4 or sum(pesos) != 100:
        pesos = [25] * len(areas)
    valores = [total * peso / 100 for peso in pesos]
    minutos = [int(valor) for valor in valores]
    for indice in sorted(range(len(areas)), key=lambda i: valores[i] - minutos[i], reverse=True)[:total - sum(minutos)]:
        minutos[indice] += 1
    return [(area, minutos[i]) for i, area in enumerate(areas) if minutos[i] > 0]


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
        # para não ignorar conteúdos que o usuário nunca treinou.
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
    datas_estudo = _proximas_datas_de_estudo(preferencia)
    fim = datas_estudo[-1]

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
    prioridades = json.loads(preferencia.prioridades_json or "{}")
    rotina_semana = _rotina_preferencia(preferencia)

    for data_atividade in datas_estudo:
        rotina = rotina_semana.get(data_atividade.weekday())
        if not rotina:
            continue
        total_minutos = _duracao_rotina(rotina)
        blocos_distribuidos = _distribuir_por_prioridade(total_minutos, areas_ordenadas, prioridades)
        cursor = _minutos(rotina["inicio"])
        pausas = sorted(rotina.get("pausas", []), key=lambda item: item["inicio"])
        ordem = 0
        for area, minutos in blocos_distribuidos:
            if minutos <= 0:
                continue
            bloco = _bloco_questoes(area, minutos)
            partes = _segmentar_bloco(cursor, minutos, pausas)
            for inicio_bloco, duracao_bloco in partes:
                if duracao_bloco <= 0:
                    continue
                hora_inicio = f"{inicio_bloco // 60:02d}:{inicio_bloco % 60:02d}"
                periodo = "manha" if inicio_bloco < 12 * 60 else "tarde" if inicio_bloco < 18 * 60 else "noite"
                ordem += 1
                session.add(
                    CronogramaAtividade(
                        usuario_id=usuario_id,
                        data=data_atividade,
                        periodo=periodo,
                        inicio_hora=hora_inicio,
                        tipo=bloco["tipo"],
                        area_id=bloco["area_id"],
                        titulo=bloco["titulo"],
                        descricao=bloco["descricao"],
                        duracao_minutos=duracao_bloco,
                        quantidade=_quantidade_questoes(duracao_bloco),
                        rota=bloco["rota"],
                        ordem=ordem,
                    )
                )
            cursor = partes[-1][0] + partes[-1][1] if partes else cursor
    session.commit()


def _serializar_preferencia(preferencia: CronogramaPreferencia) -> dict:
    rotina_semana = _rotina_preferencia(preferencia)
    dias_escolhidos = json.loads(preferencia.dias_semana_json or "[0,1,2,3,4,5,6]")
    duracoes = [_duracao_rotina(rotina_semana[dia]) for dia in dias_escolhidos if dia in rotina_semana]
    media_minutos = round(sum(duracoes) / len(duracoes)) if duracoes else _duracao_estudo(preferencia)
    return {
        "horas_por_dia": media_minutos / 60,
        "minutos_por_dia": media_minutos,
        "periodos": _periodos_preferencia(preferencia),
        "inicio_hora": preferencia.inicio_hora,
        "fim_hora": preferencia.fim_hora,
        "pausa_inicio": preferencia.pausa_inicio,
        "pausa_fim": preferencia.pausa_fim,
        "dias_semana": json.loads(preferencia.dias_semana_json or "[0,1,2,3,4,5,6]"),
        "prioridades": json.loads(preferencia.prioridades_json or "{}"),
        "rotina_semana": {str(dia): dados for dia, dados in rotina_semana.items()},
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
        "inicio_hora": item.inicio_hora,
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
    datas_estudo = _proximas_datas_de_estudo(preferencia)
    fim = datas_estudo[-1]
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
    for dia in datas_estudo:
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
    fim = _proximas_datas_de_estudo(preferencia)[-1]
    existe = session.exec(
        select(CronogramaAtividade.id).where(
            CronogramaAtividade.usuario_id == usuario.id,
            CronogramaAtividade.data >= hoje,
            CronogramaAtividade.data <= fim,
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
    rotina_semana = payload.rotina_semana or {
        dia: {"inicio": payload.inicio_hora, "fim": payload.fim_hora,
              "pausas": ([{"inicio": payload.pausa_inicio, "fim": payload.pausa_fim}]
                         if payload.pausa_inicio and payload.pausa_fim else [])}
        for dia in payload.dias_semana
    }
    if not set(payload.dias_semana).issubset(rotina_semana) or any(dia < 0 or dia > 6 for dia in rotina_semana):
        raise HTTPException(status_code=422, detail="Configure um horário para cada dia selecionado.")
    for dia, rotina in rotina_semana.items():
        if dia not in payload.dias_semana:
            continue
        inicio = _minutos(rotina.get("inicio", ""))
        fim = _minutos(rotina.get("fim", ""))
        if fim <= inicio:
            raise HTTPException(status_code=422, detail="O horário final precisa ser depois do início.")
        pausas = rotina.get("pausas", [])
        if not isinstance(pausas, list) or any(not isinstance(pausa, dict) for pausa in pausas):
            raise HTTPException(status_code=422, detail="Revise as pausas configuradas para esse dia.")
        if len(pausas) > 8:
            raise HTTPException(status_code=422, detail="Cada dia pode ter no máximo oito pausas.")
        anterior = inicio
        for pausa in sorted(pausas, key=lambda item: item.get("inicio", "")):
            pausa_inicio = _minutos(pausa.get("inicio", ""))
            pausa_fim = _minutos(pausa.get("fim", ""))
            if pausa_inicio < anterior or pausa_fim <= pausa_inicio or pausa_fim > fim:
                raise HTTPException(status_code=422, detail="As pausas precisam estar dentro do horário e não podem se sobrepor.")
            anterior = pausa_fim
        minutos_estudo = _duracao_rotina(rotina)
        if minutos_estudo < 60 or minutos_estudo > 600:
            raise HTTPException(status_code=422, detail="O tempo líquido de estudo por dia deve ficar entre 1 e 10 horas.")
    areas = session.exec(select(Area).order_by(Area.ordem)).all()
    slugs = {area.slug for area in areas}
    if len(slugs) != 4:
        raise HTTPException(status_code=422, detail="O cronograma precisa ter quatro áreas cadastradas.")
    prioridades = payload.prioridades
    if set(prioridades) != slugs or any(valor < 0 or valor > 100 for valor in prioridades.values()) or sum(prioridades.values()) != 100:
        raise HTTPException(status_code=422, detail="Distribua 100% entre as quatro áreas.")
    rotinas_ordenadas = [rotina_semana[dia] for dia in sorted(payload.dias_semana)]
    rotina_principal = rotinas_ordenadas[0]
    preferencia.minutos_por_dia = round(sum(_duracao_rotina(rotina) for rotina in rotinas_ordenadas) / len(rotinas_ordenadas))
    preferencia.inicio_hora = rotina_principal["inicio"]
    preferencia.fim_hora = rotina_principal["fim"]
    pausas_principais = rotina_principal.get("pausas", [])
    preferencia.pausa_inicio = pausas_principais[0]["inicio"] if pausas_principais else None
    preferencia.pausa_fim = pausas_principais[0]["fim"] if pausas_principais else None
    preferencia.dias_semana_json = json.dumps(payload.dias_semana)
    preferencia.prioridades_json = json.dumps(prioridades)
    preferencia.rotina_semana_json = json.dumps(rotina_semana)
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

