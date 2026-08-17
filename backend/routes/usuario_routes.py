from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pwdlib import PasswordHash

from database.database import get_session
from models.models import Usuarios

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

senha_context = PasswordHash.recommended()


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

    session.add(usuario)
    session.commit()
    session.refresh(usuario)

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