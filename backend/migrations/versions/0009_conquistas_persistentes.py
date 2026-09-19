"""persiste conquistas desbloqueadas

Revision ID: 0009
Revises: 0008
"""

from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "conquistas_usuario",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("desbloqueada_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "slug", name="uq_conquista_usuario_slug"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_conquistas_usuario_usuario_id", "conquistas_usuario", ["usuario_id"])
    op.create_index("ix_conquistas_usuario_slug", "conquistas_usuario", ["slug"])


def downgrade() -> None:
    op.drop_table("conquistas_usuario")
