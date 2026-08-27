"""perfil funcional, metas e dados visuais do usuario

Revision ID: 0004
Revises: 0003
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("casa", sa.String(length=30), nullable=False, server_default="corvinal"),
    )
    op.add_column(
        "usuarios",
        sa.Column("avatar_url", sa.String(length=255), nullable=False, server_default="/avatar.png"),
    )

    op.create_table(
        "metas_usuario",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("periodo", sa.String(length=20), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("valor_meta", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "periodo", "tipo", name="uq_meta_usuario_periodo_tipo"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_metas_usuario_usuario_id", "metas_usuario", ["usuario_id"])
    op.create_index("ix_metas_usuario_periodo", "metas_usuario", ["periodo"])
    op.create_index("ix_metas_usuario_tipo", "metas_usuario", ["tipo"])


def downgrade() -> None:
    op.drop_table("metas_usuario")
    op.drop_column("usuarios", "avatar_url")
    op.drop_column("usuarios", "casa")
