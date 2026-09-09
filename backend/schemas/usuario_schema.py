from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    casa: str = Field(default="corvinal", max_length=30)
    avatar_url: str = Field(default="/avatar.png", max_length=255)
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
    casa: str
    avatar_url: str
    modo_escuro: bool
    tema_roxo_padrao: bool

    model_config = ConfigDict(from_attributes=True)
