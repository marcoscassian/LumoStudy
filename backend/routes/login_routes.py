from datetime import datetime, timedelta
from typing import Annotated
import secrets

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from pydantic import BaseModel
from pwdlib import PasswordHash
from sqlmodel import Session, select
from starlette import status

from database.database import get_session
from models.models import Usuarios, RecuperacaoSenha

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/login", tags=["login"])

senha_context = PasswordHash.recommended()

oauth_schema = OAuth2PasswordBearer(tokenUrl="/login/")

SECRET = "lumostudy_secret"
ALGORITHM = "HS256"


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    nova_senha: str


def validar_senha(senha: str, senha_hash: str) -> bool:
    return senha_context.verify(password=senha, hash=senha_hash)


def create_access_token(data: dict, expires: timedelta | None = None):
    to_encode = data.copy()

    if expires:
        expire = datetime.now() + expires
    else:
        expire = datetime.now() + timedelta(minutes=30)

    to_encode.update({"exp": expire})

    token = jwt.encode(
        to_encode,
        SECRET,
        algorithm=ALGORITHM
    )

    return token


def get_usuario(
    token: Annotated[str, Depends(oauth_schema)],
    session: SessionDep
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Usuário não autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        dados = jwt.decode(
            token,
            SECRET,
            algorithms=[ALGORITHM]
        )

        email = dados.get("sub")

        if not email:
            raise credentials_exception

        usuario = session.exec(
            select(Usuarios).where(
                Usuarios.email == email
            )
        ).first()

        if not usuario:
            raise credentials_exception

        return usuario

    except Exception:
        raise credentials_exception


@router.post("/")
def login(
    session: SessionDep,
    form_data: OAuth2PasswordRequestForm = Depends()
):
    usuario = session.exec(
        select(Usuarios).where(
            Usuarios.email == form_data.username
        )
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=401,
            detail="Usuário/senha incorreta"
        )

    if not validar_senha(
        form_data.password,
        usuario.senha_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Usuário/senha incorreta"
        )

    access_token = create_access_token(
        data={"sub": usuario.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@router.post("/logout")
def logout():
    return {
        "mensagem": "Logout realizado com sucesso"
    }


@router.post("/forgot-password")
def forgot_password(
    dados: ForgotPasswordRequest,
    session: SessionDep
):
    usuario = session.exec(
        select(Usuarios).where(
            Usuarios.email == dados.email
        )
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    token = secrets.token_urlsafe(32)

    recuperacao = RecuperacaoSenha(
        email=dados.email,
        token=token
    )

    session.add(recuperacao)
    session.commit()

    return {
        "mensagem": "Token de recuperação gerado",
        "token": token
    }


@router.post("/reset-password")
def reset_password(
    dados: ResetPasswordRequest,
    session: SessionDep
):
    recuperacao = session.exec(
        select(RecuperacaoSenha).where(
            RecuperacaoSenha.token == dados.token
        )
    ).first()

    if not recuperacao:
        raise HTTPException(
            status_code=400,
            detail="Token inválido"
        )

    usuario = session.exec(
        select(Usuarios).where(
            Usuarios.email == recuperacao.email
        )
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuário não encontrado"
        )

    usuario.senha_hash = senha_context.hash(
        dados.nova_senha
    )

    session.add(usuario)
    session.delete(recuperacao)
    session.commit()

    return {
        "mensagem": "Senha alterada com sucesso"
    }


UsuarioLogado = Annotated[
    Usuarios,
    Depends(get_usuario)
]
