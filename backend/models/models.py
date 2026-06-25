from datetime import datetime
from pydantic import EmailStr
from sqlmodel import SQLModel, Field


class Usuarios(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(nullable=False)
    email: EmailStr = Field(nullable=False, unique=True)
    senha_hash: str = Field(nullable=False)
    criado_em: datetime = Field(default_factory=datetime.now)


class RecuperacaoSenha(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: EmailStr
    token: str
    criado_em: datetime = Field(default_factory=datetime.now)
