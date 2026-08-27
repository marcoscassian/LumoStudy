from datetime import date, datetime

from pydantic import EmailStr
from sqlalchemy import Column, Text, UniqueConstraint
from sqlmodel import Field, SQLModel


MYSQL_TABLE = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"}


class Usuarios(SQLModel, table=True):
    __tablename__ = "usuarios"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(max_length=150, nullable=False)
    email: EmailStr = Field(max_length=255, nullable=False, unique=True, index=True)
    senha_hash: str = Field(max_length=255, nullable=False)
    criado_em: datetime = Field(default_factory=datetime.now, nullable=False)
    coins: int = Field(default=0, nullable=False)
    streak: int = Field(default=0, nullable=False)
    xp: int = Field(default=0, nullable=False)
    is_admin: bool = Field(default=False, nullable=False)


class Area(SQLModel, table=True):
    __tablename__ = "areas"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(max_length=150, nullable=False)
    slug: str = Field(max_length=50, nullable=False, unique=True, index=True)
    ordem: int = Field(default=0, nullable=False)


class Tema(SQLModel, table=True):
    __tablename__ = "temas"
    __table_args__ = (
        UniqueConstraint("area_id", "slug", name="uq_tema_area_slug"),
        MYSQL_TABLE,
    )

    id: int | None = Field(default=None, primary_key=True)
    area_id: int = Field(foreign_key="areas.id", ondelete="CASCADE", nullable=False, index=True)
    nome: str = Field(max_length=150, nullable=False)
    slug: str = Field(max_length=100, nullable=False)
    descricao: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    ordem: int = Field(default=0, nullable=False)
    ativo: bool = Field(default=True, nullable=False, index=True)


class Prova(SQLModel, table=True):
    __tablename__ = "provas"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    codigo: str = Field(max_length=30, nullable=False, unique=True, index=True)
    nome: str = Field(max_length=150, nullable=False)
    ano: int = Field(nullable=False, index=True)
    ativa: bool = Field(default=True, nullable=False, index=True)


class Questao(SQLModel, table=True):
    __tablename__ = "questoes"
    __table_args__ = (
        UniqueConstraint("prova_id", "numero", name="uq_questao_prova_numero"),
        MYSQL_TABLE,
    )

    id: int | None = Field(default=None, primary_key=True)
    prova_id: int = Field(foreign_key="provas.id", ondelete="CASCADE", nullable=False, index=True)
    numero: str = Field(max_length=30, nullable=False, index=True)
    area_id: int = Field(foreign_key="areas.id", ondelete="RESTRICT", nullable=False, index=True)
    tema_id: int | None = Field(default=None, foreign_key="temas.id", ondelete="SET NULL", index=True)
    disciplina: str | None = Field(default=None, max_length=100, index=True)
    nivel: str = Field(default="medio", max_length=20, nullable=False, index=True)
    caminho_json: str = Field(max_length=255, nullable=False)
    ativa: bool = Field(default=True, nullable=False, index=True)


class QuestaoEditorial(SQLModel, table=True):
    __tablename__ = "questoes_editoriais"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    questao_id: int = Field(foreign_key="questoes.id", ondelete="CASCADE", nullable=False, unique=True, index=True)
    resolucao: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    disciplina: str | None = Field(default=None, max_length=100, index=True)
    conteudo_principal: str | None = Field(default=None, max_length=150, index=True)
    atualizado_por: int | None = Field(default=None, foreign_key="usuarios.id", ondelete="SET NULL", index=True)
    criado_em: datetime = Field(default_factory=datetime.now, nullable=False)
    atualizado_em: datetime = Field(default_factory=datetime.now, nullable=False)


class Flashcard(SQLModel, table=True):
    __tablename__ = "flashcards"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    frente: str = Field(sa_column=Column(Text, nullable=False))
    verso: str = Field(sa_column=Column(Text, nullable=False))
    disciplina: str = Field(max_length=100, nullable=False, index=True)
    conteudo_principal: str = Field(max_length=150, nullable=False, index=True)
    questao_id: int | None = Field(default=None, foreign_key="questoes.id", ondelete="SET NULL", index=True)
    ativo: bool = Field(default=True, nullable=False, index=True)
    criado_por: int | None = Field(default=None, foreign_key="usuarios.id", ondelete="SET NULL", index=True)
    criado_em: datetime = Field(default_factory=datetime.now, nullable=False)
    atualizado_em: datetime = Field(default_factory=datetime.now, nullable=False)


class Simulado(SQLModel, table=True):
    __tablename__ = "simulados"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    nome: str = Field(max_length=150, nullable=False)
    descricao: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    tempo_limite_minutos: int | None = Field(default=None)
    ativo: bool = Field(default=True, nullable=False, index=True)
    criado_em: datetime = Field(default_factory=datetime.now, nullable=False)


class SimuladoQuestao(SQLModel, table=True):
    __tablename__ = "simulado_questoes"
    __table_args__ = (
        UniqueConstraint("simulado_id", "questao_id", name="uq_simulado_questao"),
        UniqueConstraint("simulado_id", "ordem", name="uq_simulado_ordem"),
        MYSQL_TABLE,
    )

    id: int | None = Field(default=None, primary_key=True)
    simulado_id: int = Field(foreign_key="simulados.id", ondelete="CASCADE", nullable=False, index=True)
    questao_id: int = Field(foreign_key="questoes.id", ondelete="CASCADE", nullable=False, index=True)
    ordem: int = Field(nullable=False)


class TentativaSimulado(SQLModel, table=True):
    __tablename__ = "tentativas_simulado"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", ondelete="CASCADE", nullable=False, index=True)
    simulado_id: int = Field(foreign_key="simulados.id", ondelete="CASCADE", nullable=False, index=True)
    iniciado_em: datetime = Field(default_factory=datetime.now, nullable=False)
    finalizado_em: datetime | None = Field(default=None)
    tempo_gasto_segundos: int = Field(default=0, nullable=False)
    total_questoes: int = Field(default=0, nullable=False)
    acertos: int = Field(default=0, nullable=False)
    finalizada: bool = Field(default=False, nullable=False, index=True)


class RespostaUsuario(SQLModel, table=True):
    __tablename__ = "respostas_usuario"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", ondelete="CASCADE", nullable=False, index=True)
    questao_id: int = Field(foreign_key="questoes.id", ondelete="CASCADE", nullable=False, index=True)
    tentativa_simulado_id: int | None = Field(default=None, foreign_key="tentativas_simulado.id", ondelete="SET NULL", index=True)
    alternativa_escolhida: str = Field(max_length=5, nullable=False)
    correta: bool = Field(nullable=False, index=True)
    respondida_em: datetime = Field(default_factory=datetime.now, nullable=False, index=True)
    tempo_segundos: int | None = Field(default=None)


class RevisaoFlashcard(SQLModel, table=True):
    __tablename__ = "revisoes_flashcard"
    __table_args__ = MYSQL_TABLE

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", ondelete="CASCADE", nullable=False, index=True)
    flashcard_id: int = Field(foreign_key="flashcards.id", ondelete="CASCADE", nullable=False, index=True)
    resultado: str = Field(max_length=20, nullable=False, index=True)
    revisado_em: datetime = Field(default_factory=datetime.now, nullable=False, index=True)
    proxima_revisao: datetime | None = Field(default=None, index=True)
    intervalo_dias: int = Field(default=1, nullable=False)


class DiaEstudo(SQLModel, table=True):
    __tablename__ = "dias_estudo"
    __table_args__ = (
        UniqueConstraint("usuario_id", "data", name="uq_dia_estudo_usuario_data"),
        MYSQL_TABLE,
    )

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", ondelete="CASCADE", nullable=False, index=True)
    data: date = Field(nullable=False, index=True)
    tempo_segundos: int = Field(default=0, nullable=False)
    questoes_respondidas: int = Field(default=0, nullable=False)
    flashcards_revisados: int = Field(default=0, nullable=False)


class ProgressoTema(SQLModel, table=True):
    __tablename__ = "progresso_tema"
    __table_args__ = (
        UniqueConstraint("usuario_id", "tema_id", name="uq_progresso_usuario_tema"),
        MYSQL_TABLE,
    )

    id: int | None = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", ondelete="CASCADE", nullable=False, index=True)
    tema_id: int = Field(foreign_key="temas.id", ondelete="CASCADE", nullable=False, index=True)
    progresso: int = Field(default=0, nullable=False)
    status: str = Field(default="nao_iniciado", max_length=30, nullable=False, index=True)
    questoes_respondidas: int = Field(default=0, nullable=False)
    questoes_corretas: int = Field(default=0, nullable=False)
    flashcards_revisados: int = Field(default=0, nullable=False)
    atualizado_em: datetime = Field(default_factory=datetime.now, nullable=False)
    concluido_em: datetime | None = Field(default=None)
