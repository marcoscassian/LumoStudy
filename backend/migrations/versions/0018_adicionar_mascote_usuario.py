"""Adiciona campos de mascote aos usuários."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    colunas = {c["name"] for c in inspector.get_columns("usuarios")}

    if "mascote_slug" not in colunas:
        op.add_column(
            "usuarios",
            sa.Column(
                "mascote_slug",
                sa.String(length=50),
                nullable=False,
                server_default="coruja",
            ),
        )

    if "mascote_url" not in colunas:
        op.add_column(
            "usuarios",
            sa.Column(
                "mascote_url",
                sa.String(length=255),
                nullable=False,
                server_default="/sprites/mascotes/coruja.png",
            ),
        )


def downgrade():
    conn = op.get_bind()
    inspector = inspect(conn)
    colunas = {c["name"] for c in inspector.get_columns("usuarios")}

    if "mascote_url" in colunas:
        op.drop_column("usuarios", "mascote_url")

    if "mascote_slug" in colunas:
        op.drop_column("usuarios", "mascote_slug")
