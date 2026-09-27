"""store independent daily study windows and breaks

Revision ID: 0014
Revises: 0013
"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cronograma_preferencias", sa.Column("rotina_semana_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("cronograma_preferencias", "rotina_semana_json")
