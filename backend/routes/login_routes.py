from datetime import datetime, timedelta
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.security.oauth2 import OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from sqlmodel import Session, select
from starlette import status

from database.database import get_session
from models.models import Usuarios

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/login", tags=["login"])

senha_context = PasswordHash.recommended()

oauth_schema = OAuth2PasswordBearer(tokenUrl="/login/")

SECRET = "lumostudy_secret"
ALGORITHM = "HS256"
REVOGADOS: set[str] = set()


def validar_senha(senha: str, senha_hash: str) -> bool:
    return senha_context.verify(password=senha, hash=senha_hash)


def create_access_token(data: dict, expires: timedelta | None = None):
    to_encode = data.copy()

    if expires:
        expire = datetime.now() + expires
    else:
        expire = datetime.now() + timedelta(days=7)

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
        if token in REVOGADOS:
            raise credentials_exception

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
        "token_type": "bearer",
        "nome": usuario.nome,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
    }


@router.get("/me")
def get_me(
    usuario: Annotated[Usuarios, Depends(get_usuario)]
):
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "coins": usuario.coins,
        "streak": usuario.streak,
        "xp": usuario.xp,
    }


@router.post("/logout")
def logout(
    token: Annotated[str, Depends(oauth_schema)]
):
    REVOGADOS.add(token)

    return {
        "mensagem": "Logout realizado com sucesso"
    }


UsuarioLogado = Annotated[
    Usuarios,
    Depends(get_usuario)
]