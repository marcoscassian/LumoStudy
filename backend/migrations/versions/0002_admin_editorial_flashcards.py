"""adiciona painel administrativo, dados editoriais e flashcards

Revision ID: 0002
Revises: 0001
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "questoes_editoriais",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("prova", sa.String(), nullable=False),
        sa.Column("numero", sa.String(), nullable=False),
        sa.Column("resolucao", sa.String(), nullable=True),
        sa.Column("disciplina", sa.String(), nullable=True),
        sa.Column("conteudo_principal", sa.String(), nullable=True),
        sa.Column("atualizado_por", sa.Integer(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["atualizado_por"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prova", "numero", name="uq_questao_editorial_prova_numero"),
    )
    op.create_index("ix_questoes_editoriais_prova", "questoes_editoriais", ["prova"])
    op.create_index("ix_questoes_editoriais_numero", "questoes_editoriais", ["numero"])
    op.create_index("ix_questoes_editoriais_disciplina", "questoes_editoriais", ["disciplina"])
    op.create_index("ix_questoes_editoriais_conteudo_principal", "questoes_editoriais", ["conteudo_principal"])

    op.create_table(
        "flashcards",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("frente", sa.String(), nullable=False),
        sa.Column("verso", sa.String(), nullable=False),
        sa.Column("disciplina", sa.String(), nullable=False),
        sa.Column("conteudo_principal", sa.String(), nullable=False),
        sa.Column("prova", sa.String(), nullable=True),
        sa.Column("numero_questao", sa.String(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["criado_por"], ["usuarios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in ("disciplina", "conteudo_principal", "prova", "numero_questao", "ativo"):
        op.create_index(f"ix_flashcards_{column}", "flashcards", [column])

    # Bootstrap local: garante que exista um administrador após a atualização.
    op.execute(
        "UPDATE usuarios SET is_admin = 1 "
        "WHERE id = (SELECT id FROM usuarios ORDER BY id LIMIT 1)"
    )


def downgrade() -> None:
    op.drop_table("flashcards")
    op.drop_table("questoes_editoriais")
    op.drop_column("usuarios", "is_admin")
