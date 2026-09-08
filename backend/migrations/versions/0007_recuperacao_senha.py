"""recuperacao de senha por token

Revision ID: 0007
Revises: 0006
"""

from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recuperacoes_senha",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("expira_em", sa.DateTime(), nullable=False),
        sa.Column("usado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_recuperacoes_senha_token_hash"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_recuperacoes_senha_usuario_id", "recuperacoes_senha", ["usuario_id"], unique=False)
    op.create_index("ix_recuperacoes_senha_token_hash", "recuperacoes_senha", ["token_hash"], unique=True)
    op.create_index("ix_recuperacoes_senha_expira_em", "recuperacoes_senha", ["expira_em"], unique=False)
    op.create_index("ix_recuperacoes_senha_usado_em", "recuperacoes_senha", ["usado_em"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_recuperacoes_senha_usado_em", table_name="recuperacoes_senha")
    op.drop_index("ix_recuperacoes_senha_expira_em", table_name="recuperacoes_senha")
    op.drop_index("ix_recuperacoes_senha_token_hash", table_name="recuperacoes_senha")
    op.drop_index("ix_recuperacoes_senha_usuario_id", table_name="recuperacoes_senha")
    op.drop_table("recuperacoes_senha")
