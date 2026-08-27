"""tema por casa da foto de perfil

Revision ID: 0006
Revises: 0005
"""

from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("tema_roxo_padrao", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "itens_loja",
        sa.Column("casa", sa.String(length=30), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("itens_loja", "casa")
    op.drop_column("usuarios", "tema_roxo_padrao")
