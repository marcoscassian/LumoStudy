from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pwdlib import PasswordHash

from database.database import get_session
from models.models import Usuarios
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

senha_context = PasswordHash.recommended()




@router.get("/me/perfil")
def get_meu_perfil(usuario: UsuarioLogado):
    """Retorna os dados públicos do perfil do usuário autenticado."""
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "criado_em": usuario.criado_em,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
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

    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "criado_em": usuario.criado_em,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
    }


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