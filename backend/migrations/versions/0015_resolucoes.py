"""store admin resolutions separately from editorial metadata

Revision ID: 0015
Revises: 0014
"""
from alembic import op
import sqlalchemy as sa

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "resolucoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["criado_por"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("questao_id", name="uq_resolucoes_questao_id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_resolucoes_questao_id", "resolucoes", ["questao_id"])
    op.create_index("ix_resolucoes_criado_por", "resolucoes", ["criado_por"])
    op.execute(
        sa.text(
            "INSERT INTO resolucoes (questao_id, texto, criado_por, criado_em, atualizado_em) "
            "SELECT questao_id, resolucao, atualizado_por, criado_em, atualizado_em "
            "FROM questoes_editoriais WHERE resolucao IS NOT NULL AND resolucao <> ''"
        )
    )


def downgrade() -> None:
    op.drop_table("resolucoes")