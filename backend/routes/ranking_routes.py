from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database.db import get_session
from models.models import Usuarios
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/ranking", tags=["ranking"])


@router.get("")
def ranking(usuario: UsuarioLogado, session: SessionDep):
    usuarios = session.exec(
        select(Usuarios).order_by(Usuarios.xp.desc(), Usuarios.streak.desc(), Usuarios.id.asc())
    ).all()

    linhas = []
    minha_posicao = None
    for posicao, item in enumerate(usuarios, start=1):
        if item.id == usuario.id:
            minha_posicao = posicao
        linhas.append(
            {
                "posicao": posicao,
                "id": item.id,
                "nome": item.nome,
                "xp": item.xp,
                "nivel": max(1, item.xp // 1000 + 1),
                "coins": item.coins,
                "streak": item.streak,
                "avatar_url": item.avatar_url,
                "eu": item.id == usuario.id,
            }
        )

    return {"minha_posicao": minha_posicao, "ranking": linhas[:100]}
