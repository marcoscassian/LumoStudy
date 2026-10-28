"""add detailed cronograma preferences and activity times

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cronograma_preferencias", sa.Column("inicio_hora", sa.String(length=5), nullable=False, server_default="13:00"))
    op.add_column("cronograma_preferencias", sa.Column("fim_hora", sa.String(length=5), nullable=False, server_default="17:00"))
    op.add_column("cronograma_preferencias", sa.Column("pausa_inicio", sa.String(length=5), nullable=True))
    op.add_column("cronograma_preferencias", sa.Column("pausa_fim", sa.String(length=5), nullable=True))
    op.add_column("cronograma_preferencias", sa.Column("dias_semana_json", sa.Text(), nullable=False, server_default="[0,1,2,3,4,5,6]"))
    op.add_column("cronograma_preferencias", sa.Column("prioridades_json", sa.Text(), nullable=False, server_default="{}"))
    op.add_column("cronograma_atividades", sa.Column("inicio_hora", sa.String(length=5), nullable=True))


def downgrade() -> None:
    op.drop_column("cronograma_atividades", "inicio_hora")
    op.drop_column("cronograma_preferencias", "prioridades_json")
    op.drop_column("cronograma_preferencias", "dias_semana_json")
    op.drop_column("cronograma_preferencias", "pausa_fim")
    op.drop_column("cronograma_preferencias", "pausa_inicio")
    op.drop_column("cronograma_preferencias", "fim_hora")
    op.drop_column("cronograma_preferencias", "inicio_hora")
