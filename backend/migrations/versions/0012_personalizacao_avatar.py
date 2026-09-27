"""persist custom avatar selection for owned shop items

Revision ID: 0012
Revises: 0011
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuario_itens",
        sa.Column("arquivo_personalizado", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("usuario_itens", "arquivo_personalizado")
