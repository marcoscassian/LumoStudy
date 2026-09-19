from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    curso: str = Field(..., min_length=2, max_length=30)
    casa: str = Field(default="grifinoria", max_length=30)
    avatar_url: str = Field(default="/avatar.png", max_length=255)
    mascote_slug: str = Field(default="coruja", max_length=50)
    mascote_url: str = Field(default="/sprites/mascotes/coruja.png", max_length=255)
    modo_escuro: bool = False
    tema_roxo_padrao: bool = False

    model_config = ConfigDict(from_attributes=True)


class UsuarioCreate(UsuarioBase):
    senha_hash: str = Field(..., min_length=6, max_length=255)


class UsuarioUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    senha_atual: str | None = Field(default=None, min_length=6, max_length=128)
    nova_senha: str | None = Field(default=None, min_length=6, max_length=128)
    modo_escuro: bool | None = None
    tema_roxo_padrao: bool | None = None

    model_config = ConfigDict(from_attributes=True)


class PerfilPublico(BaseModel):
    id: int | None
    nome: str
    email: EmailStr | str
    criado_em: datetime
    coins: int
    streak: int
    xp: int
    curso: str
    casa: str
    avatar_url: str
    mascote_slug: str
    mascote_url: str
    modo_escuro: bool
    tema_roxo_padrao: bool

    model_config = ConfigDict(from_attributes=True)
