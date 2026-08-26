from datetime import datetime
from pydantic import EmailStr
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field


class Usuarios(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(nullable=False)
    email: EmailStr = Field(nullable=False, unique=True)
    senha_hash: str = Field(nullable=False)
    criado_em: datetime = Field(default_factory=datetime.now)
    coins: int = Field(default=0, nullable=False)
    streak: int = Field(default=0, nullable=False)
    xp: int = Field(default=0, nullable=False)
    is_admin: bool = Field(default=False, nullable=False)


class QuestaoEditorial(SQLModel, table=True):
    __tablename__ = "questoes_editoriais"
    __table_args__ = (
        UniqueConstraint("prova", "numero", name="uq_questao_editorial_prova_numero"),
    )

    id: int | None = Field(default=None, primary_key=True)
    prova: str = Field(index=True, nullable=False)
    numero: str = Field(index=True, nullable=False)
    resolucao: str | None = Field(default=None)
    disciplina: str | None = Field(default=None, index=True)
    conteudo_principal: str | None = Field(default=None, index=True)
    atualizado_por: int | None = Field(default=None, foreign_key="usuarios.id")
    criado_em: datetime = Field(default_factory=datetime.now)
    atualizado_em: datetime = Field(default_factory=datetime.now)


class Flashcard(SQLModel, table=True):
    __tablename__ = "flashcards"

    id: int | None = Field(default=None, primary_key=True)
    frente: str = Field(nullable=False)
    verso: str = Field(nullable=False)
    disciplina: str = Field(index=True, nullable=False)
    conteudo_principal: str = Field(index=True, nullable=False)
    prova: str | None = Field(default=None, index=True)
    numero_questao: str | None = Field(default=None, index=True)
    ativo: bool = Field(default=True, nullable=False, index=True)
    criado_por: int | None = Field(default=None, foreign_key="usuarios.id")
    criado_em: datetime = Field(default_factory=datetime.now)
    atualizado_em: datetime = Field(default_factory=datetime.now)
