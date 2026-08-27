"""progresso, respostas, revisoes, dias de estudo e simulados

Revision ID: 0003
Revises: 0002
"""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "simulados",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("tempo_limite_minutos", sa.Integer(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_simulados_ativo", "simulados", ["ativo"])

    op.create_table(
        "simulado_questoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("simulado_id", sa.Integer(), nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["simulado_id"], ["simulados.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("simulado_id", "questao_id", name="uq_simulado_questao"),
        sa.UniqueConstraint("simulado_id", "ordem", name="uq_simulado_ordem"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_simulado_questoes_simulado_id", "simulado_questoes", ["simulado_id"])
    op.create_index("ix_simulado_questoes_questao_id", "simulado_questoes", ["questao_id"])

    op.create_table(
        "tentativas_simulado",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("simulado_id", sa.Integer(), nullable=False),
        sa.Column("iniciado_em", sa.DateTime(), nullable=False),
        sa.Column("finalizado_em", sa.DateTime(), nullable=True),
        sa.Column("tempo_gasto_segundos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_questoes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("acertos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("finalizada", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["simulado_id"], ["simulados.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("usuario_id", "simulado_id", "finalizada"):
        op.create_index(f"ix_tentativas_simulado_{coluna}", "tentativas_simulado", [coluna])

    op.create_table(
        "respostas_usuario",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=False),
        sa.Column("tentativa_simulado_id", sa.Integer(), nullable=True),
        sa.Column("alternativa_escolhida", sa.String(length=5), nullable=False),
        sa.Column("correta", sa.Boolean(), nullable=False),
        sa.Column("respondida_em", sa.DateTime(), nullable=False),
        sa.Column("tempo_segundos", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tentativa_simulado_id"], ["tentativas_simulado.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("usuario_id", "questao_id", "tentativa_simulado_id", "correta", "respondida_em"):
        op.create_index(f"ix_respostas_usuario_{coluna}", "respostas_usuario", [coluna])

    op.create_table(
        "revisoes_flashcard",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("flashcard_id", sa.Integer(), nullable=False),
        sa.Column("resultado", sa.String(length=20), nullable=False),
        sa.Column("revisado_em", sa.DateTime(), nullable=False),
        sa.Column("proxima_revisao", sa.DateTime(), nullable=True),
        sa.Column("intervalo_dias", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["flashcard_id"], ["flashcards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("usuario_id", "flashcard_id", "resultado", "revisado_em", "proxima_revisao"):
        op.create_index(f"ix_revisoes_flashcard_{coluna}", "revisoes_flashcard", [coluna])

    op.create_table(
        "dias_estudo",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("tempo_segundos", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("questoes_respondidas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("flashcards_revisados", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "data", name="uq_dia_estudo_usuario_data"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_dias_estudo_usuario_id", "dias_estudo", ["usuario_id"])
    op.create_index("ix_dias_estudo_data", "dias_estudo", ["data"])

    op.create_table(
        "progresso_tema",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("tema_id", sa.Integer(), nullable=False),
        sa.Column("progresso", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="nao_iniciado"),
        sa.Column("questoes_respondidas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("questoes_corretas", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("flashcards_revisados", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.Column("concluido_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tema_id"], ["temas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "tema_id", name="uq_progresso_usuario_tema"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("usuario_id", "tema_id", "status"):
        op.create_index(f"ix_progresso_tema_{coluna}", "progresso_tema", [coluna])


def downgrade() -> None:
    op.drop_table("progresso_tema")
    op.drop_table("dias_estudo")
    op.drop_table("revisoes_flashcard")
    op.drop_table("respostas_usuario")
    op.drop_table("tentativas_simulado")
    op.drop_table("simulado_questoes")
    op.drop_table("simulados")
