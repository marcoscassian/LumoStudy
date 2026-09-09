from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlmodel import Session, select
from starlette import status

from config_env import carregar_env
from database.db import get_session
from models.models import RecuperacaoSenha, Usuarios
from repositories.usuario_repository import UsuarioRepository
from services.email_service import (
    RESET_TOKEN_MINUTES,
    email_configurado,
    enviar_email_recuperacao,
)
from services.progresso_service import recalcular_streak

carregar_env()

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/login", tags=["login"])

senha_context = PasswordHash.recommended()

oauth_schema = OAuth2PasswordBearer(tokenUrl="/login/")

SECRET = os.getenv("JWT_SECRET", "lumostudy_secret_dev_troque_em_producao")
ALGORITHM = "HS256"
REVOGADOS: set[str] = set()


class EsqueciSenhaPayload(BaseModel):
    email: EmailStr


class RedefinirSenhaPayload(BaseModel):
    token: str = Field(min_length=20, max_length=300)
    nova_senha: str = Field(min_length=6, max_length=128)


def validar_senha(senha: str, senha_hash: str) -> bool:
    return senha_context.verify(password=senha, hash=senha_hash)


def get_usuario_repository(session: SessionDep) -> UsuarioRepository:
    return UsuarioRepository(session)


def create_access_token(data: dict, expires: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now() + (expires or timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET, algorithm=ALGORITHM)


def get_usuario(
    token: Annotated[str, Depends(oauth_schema)],
    session: SessionDep,
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Usuário não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        if token in REVOGADOS:
            raise credentials_exception

        dados = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        email = dados.get("sub")

        if not email:
            raise credentials_exception

        usuario = session.exec(
            select(Usuarios).where(Usuarios.email == email)
        ).first()

        if not usuario:
            raise credentials_exception

        return usuario
    except Exception:
        raise credentials_exception


def exigir_admin(usuario: Annotated[Usuarios, Depends(get_usuario)]):
    if not usuario.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito a administradores",
        )
    return usuario


@router.post("/")
def login(
    session: SessionDep,
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    repo = UsuarioRepository(session)
    usuario = repo.get_by_email(form_data.username)

    if not usuario or not validar_senha(form_data.password, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Usuário/senha incorreta")

    access_token = create_access_token(data={"sub": usuario.email})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "nome": usuario.nome,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
        "is_admin": usuario.is_admin,
        "casa": usuario.casa,
        "avatar_url": usuario.avatar_url,
        "modo_escuro": usuario.modo_escuro,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
    }


@router.post("/esqueci-senha")
def esqueci_senha(dados: EsqueciSenhaPayload, session: SessionDep):
    """Gera um token de uso único e envia o link pelo Gmail do LumoStudy."""
    mensagem = (
        "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha."
    )

    if not email_configurado():
        raise HTTPException(
            status_code=503,
            detail=(
                "O envio de e-mail ainda não está configurado. "
                "Coloque EMAIL_PASSWORD com a senha de app do Google em backend/.env."
            ),
        )

    email = str(dados.email).strip().lower()
    usuario = session.exec(
        select(Usuarios).where(Usuarios.email == email)
    ).first()

    # Não revela se o e-mail está ou não cadastrado.
    if not usuario:
        return {"mensagem": mensagem}

    agora = datetime.now()

    # Evita disparar vários e-mails em sequência para a mesma conta.
    recente = session.exec(
        select(RecuperacaoSenha)
        .where(
            RecuperacaoSenha.usuario_id == usuario.id,
            RecuperacaoSenha.criado_em >= agora - timedelta(seconds=60),
            RecuperacaoSenha.usado_em == None,  # noqa: E711
        )
        .order_by(RecuperacaoSenha.criado_em.desc())
    ).first()
    if recente:
        return {"mensagem": mensagem}

    # Invalida links anteriores ainda abertos.
    anteriores = session.exec(
        select(RecuperacaoSenha).where(
            RecuperacaoSenha.usuario_id == usuario.id,
            RecuperacaoSenha.usado_em == None,  # noqa: E711
        )
    ).all()
    for registro in anteriores:
        registro.usado_em = agora
        session.add(registro)

    token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    recuperacao = RecuperacaoSenha(
        usuario_id=usuario.id,
        token_hash=token_hash,
        criado_em=agora,
        expira_em=agora + timedelta(minutes=RESET_TOKEN_MINUTES),
    )
    session.add(recuperacao)
    session.commit()
    session.refresh(recuperacao)

    try:
        enviar_email_recuperacao(usuario.email, usuario.nome, token)
    except Exception as exc:
        # O token não pode continuar válido se o e-mail não foi enviado.
        recuperacao.usado_em = datetime.now()
        session.add(recuperacao)
        session.commit()
        print(f"Erro ao enviar e-mail de recuperação: {exc}")
        raise HTTPException(
            status_code=503,
            detail=(
                "Não foi possível enviar o e-mail de recuperação. "
                "Confira a senha de app do Gmail no backend/.env."
            ),
        )

    return {"mensagem": mensagem}


@router.post("/redefinir-senha")
def redefinir_senha(dados: RedefinirSenhaPayload, session: SessionDep):
    agora = datetime.now()
    token_hash = hashlib.sha256(dados.token.encode("utf-8")).hexdigest()

    recuperacao = session.exec(
        select(RecuperacaoSenha).where(RecuperacaoSenha.token_hash == token_hash)
    ).first()

    if (
        not recuperacao
        or recuperacao.usado_em is not None
        or recuperacao.expira_em < agora
    ):
        raise HTTPException(
            status_code=400,
            detail="Este link é inválido, já foi usado ou expirou.",
        )

    usuario = session.get(Usuarios, recuperacao.usuario_id)
    if not usuario:
        raise HTTPException(status_code=400, detail="Conta não encontrada.")

    nova_senha = dados.nova_senha.strip()
    if len(nova_senha) < 6:
        raise HTTPException(
            status_code=400,
            detail="A nova senha deve ter pelo menos 6 caracteres.",
        )

    usuario.senha_hash = senha_context.hash(nova_senha)
    recuperacao.usado_em = agora
    session.add(usuario)
    session.add(recuperacao)

    # Qualquer outro link desse usuário também deixa de valer.
    outros = session.exec(
        select(RecuperacaoSenha).where(
            RecuperacaoSenha.usuario_id == usuario.id,
            RecuperacaoSenha.usado_em == None,  # noqa: E711
        )
    ).all()
    for registro in outros:
        registro.usado_em = agora
        session.add(registro)

    session.commit()
    return {"mensagem": "Senha alterada com sucesso. Você já pode entrar na conta."}


@router.get("/me")
def get_me(
    usuario: Annotated[Usuarios, Depends(get_usuario)],
    session: SessionDep,
):
    recalcular_streak(session, usuario)
    session.commit()
    session.refresh(usuario)
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
        "is_admin": usuario.is_admin,
        "casa": usuario.casa,
        "avatar_url": usuario.avatar_url,
        "modo_escuro": usuario.modo_escuro,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
    }


@router.post("/logout")
def logout(token: Annotated[str, Depends(oauth_schema)]):
    REVOGADOS.add(token)
    return {"mensagem": "Logout realizado com sucesso"}


UsuarioLogado = Annotated[Usuarios, Depends(get_usuario)]
AdminLogado = Annotated[Usuarios, Depends(exigir_admin)]
