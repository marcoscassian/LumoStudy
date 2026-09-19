from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, select

from database.db import get_session
from models.models import Notificacao
from routes.login_routes import UsuarioLogado
from services.progresso_service import garantir_notificacao_meta_diaria

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/notificacoes", tags=["notificacoes"])


def _serializar(item: Notificacao) -> dict:
    return {
        "id": item.id,
        "titulo": item.titulo,
        "mensagem": item.mensagem,
        "tipo": item.tipo,
        "rota": item.rota,
        "lida": item.lida,
        "criada_em": item.criada_em,
    }


@router.get("")
def listar_notificacoes(usuario: UsuarioLogado, session: SessionDep, limite: int = 10):
    garantir_notificacao_meta_diaria(session, usuario)
    session.commit()
    limite = max(1, min(30, limite))
    itens = session.exec(
        select(Notificacao)
        .where(Notificacao.usuario_id == usuario.id)
        .order_by(Notificacao.criada_em.desc())
        .limit(limite)
    ).all()
    nao_lidas = session.exec(
        select(func.count(Notificacao.id)).where(
            Notificacao.usuario_id == usuario.id,
            Notificacao.lida == False,  # noqa: E712
        )
    ).one()
    return {"nao_lidas": int(nao_lidas or 0), "itens": [_serializar(item) for item in itens]}


@router.post("/ler-todas")
def marcar_todas_como_lidas(usuario: UsuarioLogado, session: SessionDep):
    itens = session.exec(
        select(Notificacao).where(
            Notificacao.usuario_id == usuario.id,
            Notificacao.lida == False,  # noqa: E712
        )
    ).all()
    for item in itens:
        item.lida = True
        session.add(item)
    session.commit()
    return {"mensagem": "Notificações marcadas como lidas", "quantidade": len(itens)}


@router.post("/{notificacao_id}/ler")
def marcar_como_lida(notificacao_id: int, usuario: UsuarioLogado, session: SessionDep):
    item = session.get(Notificacao, notificacao_id)
    if not item or item.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    item.lida = True
    session.add(item)
    session.commit()
    return {"mensagem": "Notificação marcada como lida"}
