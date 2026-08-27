from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pwdlib import PasswordHash
from sqlalchemy import func
from sqlmodel import Session, select

from database.db import get_session
from models.models import (
    Area,
    DiaEstudo,
    Flashcard,
    MetaUsuario,
    ProgressoTema,
    Questao,
    RespostaUsuario,
    RevisaoFlashcard,
    Simulado,
    Tema,
    TentativaSimulado,
    Usuarios,
)
from routes.login_routes import UsuarioLogado
from services.progresso_service import garantir_metas_padrao, recalcular_streak

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/usuarios", tags=["usuarios"])
senha_context = PasswordHash.recommended()


def _perfil_publico(usuario: Usuarios) -> dict:
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "criado_em": usuario.criado_em,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
        "casa": usuario.casa,
        "avatar_url": usuario.avatar_url,
        "modo_escuro": usuario.modo_escuro,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
    }


def _contar(session: Session, model, *condicoes) -> int:
    valor = session.exec(select(func.count(model.id)).where(*condicoes)).one()
    return int(valor or 0)


def _intervalos_meta() -> dict[str, date]:
    hoje = date.today()
    return {
        "diario": hoje,
        "semanal": hoje - timedelta(days=hoje.weekday()),
        "mensal": hoje.replace(day=1),
    }


def _montar_metas(session: Session, usuario_id: int) -> dict:
    garantir_metas_padrao(session, usuario_id)
    metas = session.exec(
        select(MetaUsuario)
        .where(MetaUsuario.usuario_id == usuario_id)
        .order_by(MetaUsuario.id)
    ).all()

    periodos_rotulo = {
        "diario": "Diário",
        "semanal": "Semanal",
        "mensal": "Mensal",
    }
    tipos_rotulo = {
        "tempo_estudo": "Tempo de estudo",
        "flashcards": "Flashcards",
        "questoes": "Questões",
    }
    ordem_tipos = ["tempo_estudo", "flashcards", "questoes"]
    inicios = _intervalos_meta()
    saida: dict[str, list[dict]] = {rotulo: [] for rotulo in periodos_rotulo.values()}

    metas_por_chave = {(meta.periodo, meta.tipo): meta.valor_meta for meta in metas}

    for periodo, rotulo in periodos_rotulo.items():
        dias = session.exec(
            select(DiaEstudo).where(
                DiaEstudo.usuario_id == usuario_id,
                DiaEstudo.data >= inicios[periodo],
                DiaEstudo.data <= date.today(),
            )
        ).all()
        atuais = {
            "tempo_estudo": int(sum(dia.tempo_segundos for dia in dias) // 60),
            "flashcards": int(sum(dia.flashcards_revisados for dia in dias)),
            "questoes": int(sum(dia.questoes_respondidas for dia in dias)),
        }
        for tipo in ordem_tipos:
            saida[rotulo].append(
                {
                    "tipo": tipo,
                    "label": tipos_rotulo[tipo],
                    "current": atuais[tipo],
                    "total": int(metas_por_chave.get((periodo, tipo), 0)),
                }
            )

    return saida


def _montar_dominio(session: Session, usuario_id: int) -> tuple[list[dict], int]:
    """Calcula o desempenho real por área usando as respostas salvas."""
    areas = session.exec(select(Area).order_by(Area.ordem)).all()
    saida = []
    total_geral = 0
    corretas_geral = 0

    for area in areas:
        respostas = session.exec(
            select(RespostaUsuario.correta)
            .join(Questao, RespostaUsuario.questao_id == Questao.id)
            .where(
                RespostaUsuario.usuario_id == usuario_id,
                Questao.area_id == area.id,
            )
        ).all()
        total = len(respostas)
        corretas = sum(1 for correta in respostas if correta)
        percentual = round((corretas / total) * 100) if total else 0
        total_geral += total
        corretas_geral += corretas
        saida.append(
            {
                "id": area.id,
                "slug": area.slug,
                "nome": area.nome,
                "percentual": percentual,
                "respondidas": total,
                "corretas": corretas,
            }
        )

    geral = round((corretas_geral / total_geral) * 100) if total_geral else 0
    return saida, geral


def _montar_atividades(session: Session, usuario_id: int, limite: int = 12) -> list[dict]:
    atividades: list[dict] = []

    respostas = session.exec(
        select(RespostaUsuario, Questao, Area)
        .join(Questao, RespostaUsuario.questao_id == Questao.id)
        .join(Area, Questao.area_id == Area.id)
        .where(RespostaUsuario.usuario_id == usuario_id)
        .order_by(RespostaUsuario.respondida_em.desc())
        .limit(limite)
    ).all()
    for resposta, questao, area in respostas:
        disciplina = questao.disciplina or area.nome
        atividades.append(
            {
                "id": f"questao-{resposta.id}",
                "tipo": "questao_correta" if resposta.correta else "questao_errada",
                "title": (
                    f"Você acertou uma questão de {disciplina}"
                    if resposta.correta
                    else f"Você respondeu uma questão de {disciplina}"
                ),
                "subject": area.nome,
                "ocorrido_em": resposta.respondida_em,
            }
        )

    revisoes = session.exec(
        select(RevisaoFlashcard, Flashcard)
        .join(Flashcard, RevisaoFlashcard.flashcard_id == Flashcard.id)
        .where(RevisaoFlashcard.usuario_id == usuario_id)
        .order_by(RevisaoFlashcard.revisado_em.desc())
        .limit(limite)
    ).all()
    for revisao, flashcard in revisoes:
        atividades.append(
            {
                "id": f"flashcard-{revisao.id}",
                "tipo": "flashcard",
                "title": f"Você revisou um flashcard de {flashcard.disciplina}",
                "subject": flashcard.conteudo_principal,
                "ocorrido_em": revisao.revisado_em,
            }
        )

    tentativas = session.exec(
        select(TentativaSimulado, Simulado)
        .join(Simulado, TentativaSimulado.simulado_id == Simulado.id)
        .where(
            TentativaSimulado.usuario_id == usuario_id,
            TentativaSimulado.finalizada == True,  # noqa: E712
        )
        .order_by(TentativaSimulado.finalizado_em.desc())
        .limit(limite)
    ).all()
    for tentativa, simulado in tentativas:
        if tentativa.finalizado_em is None:
            continue
        atividades.append(
            {
                "id": f"simulado-{tentativa.id}",
                "tipo": "simulado",
                "title": (
                    f"Você concluiu {simulado.nome} com "
                    f"{tentativa.acertos}/{tentativa.total_questoes} acertos"
                ),
                "subject": "Simulados",
                "ocorrido_em": tentativa.finalizado_em,
            }
        )

    atividades.sort(key=lambda item: item["ocorrido_em"], reverse=True)
    return atividades[:limite]


@router.get("/me/perfil")
def get_meu_perfil(usuario: UsuarioLogado, session: SessionDep):
    """Retorna os dados públicos do perfil do usuário autenticado."""
    garantir_metas_padrao(session, usuario.id)
    recalcular_streak(session, usuario)
    session.commit()
    session.refresh(usuario)
    return _perfil_publico(usuario)


@router.get("/me/dashboard")
def get_dashboard_perfil(usuario: UsuarioLogado, session: SessionDep):
    """Todos os números exibidos no perfil, calculados a partir do MySQL."""
    garantir_metas_padrao(session, usuario.id)
    recalcular_streak(session, usuario)

    questoes_respondidas = _contar(
        session,
        RespostaUsuario,
        RespostaUsuario.usuario_id == usuario.id,
    )
    questoes_corretas = _contar(
        session,
        RespostaUsuario,
        RespostaUsuario.usuario_id == usuario.id,
        RespostaUsuario.correta == True,  # noqa: E712
    )
    flashcards_revisados = _contar(
        session,
        RevisaoFlashcard,
        RevisaoFlashcard.usuario_id == usuario.id,
    )
    simulados_resolvidos = _contar(
        session,
        TentativaSimulado,
        TentativaSimulado.usuario_id == usuario.id,
        TentativaSimulado.finalizada == True,  # noqa: E712
    )
    temas_concluidos = _contar(
        session,
        ProgressoTema,
        ProgressoTema.usuario_id == usuario.id,
        ProgressoTema.status == "concluido",
    )
    taxa_acertos = round((questoes_corretas / questoes_respondidas) * 100) if questoes_respondidas else 0

    dominio_areas, dominio_geral = _montar_dominio(session, usuario.id)
    metas = _montar_metas(session, usuario.id)
    atividades = _montar_atividades(session, usuario.id)

    session.commit()
    session.refresh(usuario)

    return {
        "usuario": _perfil_publico(usuario),
        "visao_geral": {
            "questoes_respondidas": questoes_respondidas,
            "flashcards_revisados": flashcards_revisados,
            "taxa_acertos": taxa_acertos,
            "simulados_resolvidos": simulados_resolvidos,
            "temas_concluidos": temas_concluidos,
        },
        "dominio_areas": dominio_areas,
        "dominio_geral": dominio_geral,
        "atividades_recentes": atividades,
        "metas": metas,
    }


@router.put("/me/perfil")
def update_meu_perfil(
    dados: dict,
    usuario: UsuarioLogado,
    session: SessionDep,
):
    """Atualiza nome, e-mail e/ou senha do usuário autenticado."""
    nome = dados.get("nome")
    email = dados.get("email")
    senha_atual = dados.get("senha_atual")
    nova_senha = dados.get("nova_senha")
    modo_escuro = dados.get("modo_escuro")
    tema_roxo_padrao = dados.get("tema_roxo_padrao")

    if nome is not None:
        nome = str(nome).strip()
        if not nome:
            raise HTTPException(status_code=400, detail="Nome não pode ficar vazio")
        usuario.nome = nome

    if email is not None:
        email = str(email).strip().lower()
        if not email:
            raise HTTPException(status_code=400, detail="E-mail não pode ficar vazio")

        outro_usuario = session.exec(
            select(Usuarios).where(
                Usuarios.email == email,
                Usuarios.id != usuario.id,
            )
        ).first()
        if outro_usuario:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")
        usuario.email = email

    if modo_escuro is not None:
        usuario.modo_escuro = bool(modo_escuro)

    if tema_roxo_padrao is not None:
        usuario.tema_roxo_padrao = bool(tema_roxo_padrao)

    if nova_senha is not None and str(nova_senha).strip():
        nova_senha = str(nova_senha).strip()
        if not senha_atual or not senha_context.verify(password=senha_atual, hash=usuario.senha_hash):
            raise HTTPException(status_code=400, detail="Senha atual incorreta")
        if len(nova_senha) < 6:
            raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres")
        usuario.senha_hash = senha_context.hash(nova_senha)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return _perfil_publico(usuario)


@router.get("/", response_model=list[Usuarios])
def get_usuarios(session: SessionDep):
    return session.exec(select(Usuarios)).all()


@router.get("/{id}", response_model=Usuarios)
def get_usuario_by_id(id: int, session: SessionDep):
    usuario = session.get(Usuarios, id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario


@router.post("/", response_model=Usuarios)
def create_usuario(usuario: Usuarios, session: SessionDep):
    usuario_existente = session.exec(
        select(Usuarios).where(Usuarios.email == usuario.email)
    ).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    usuario.senha_hash = senha_context.hash(usuario.senha_hash)
    usuario.is_admin = False
    usuario.coins = 0
    usuario.streak = 0
    usuario.xp = 0
    usuario.casa = usuario.casa or "corvinal"
    usuario.avatar_url = usuario.avatar_url or "/avatar.png"
    usuario.modo_escuro = bool(usuario.modo_escuro)
    usuario.tema_roxo_padrao = bool(usuario.tema_roxo_padrao)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    garantir_metas_padrao(session, usuario.id)
    session.commit()
    return usuario


@router.delete("/{id}")
def delete_usuario(id: int, session: SessionDep):
    usuario = session.get(Usuarios, id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    session.delete(usuario)
    session.commit()
    return {"mensagem": "Usuário excluído com sucesso"}


@router.put("/{id}", response_model=Usuarios)
def update_usuario(id: int, usuario_atualizado: Usuarios, session: SessionDep):
    usuario = session.get(Usuarios, id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario.nome = usuario_atualizado.nome
    usuario.email = usuario_atualizado.email
    if usuario_atualizado.senha_hash:
        usuario.senha_hash = senha_context.hash(usuario_atualizado.senha_hash)

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario
