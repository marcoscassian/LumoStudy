"""cronograma personalizado

Revision ID: 0010
Revises: 0009
"""

from alembic import op
import sqlalchemy as sa

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cronograma_preferencias",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("minutos_por_dia", sa.Integer(), nullable=False),
        sa.Column("manha", sa.Boolean(), nullable=False),
        sa.Column("tarde", sa.Boolean(), nullable=False),
        sa.Column("noite", sa.Boolean(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", name="uq_cronograma_preferencia_usuario"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_cronograma_preferencias_usuario_id", "cronograma_preferencias", ["usuario_id"])

    op.create_table(
        "cronograma_atividades",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column("periodo", sa.String(length=20), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=True),
        sa.Column("titulo", sa.String(length=180), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("duracao_minutos", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=True),
        sa.Column("rota", sa.String(length=255), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.Column("concluida", sa.Boolean(), nullable=False),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "data", "ordem", name="uq_cronograma_usuario_data_ordem"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_cronograma_atividades_usuario_id", "cronograma_atividades", ["usuario_id"])
    op.create_index("ix_cronograma_atividades_data", "cronograma_atividades", ["data"])
    op.create_index("ix_cronograma_atividades_periodo", "cronograma_atividades", ["periodo"])
    op.create_index("ix_cronograma_atividades_tipo", "cronograma_atividades", ["tipo"])
    op.create_index("ix_cronograma_atividades_area_id", "cronograma_atividades", ["area_id"])
    op.create_index("ix_cronograma_atividades_concluida", "cronograma_atividades", ["concluida"])


def downgrade() -> None:
    op.drop_table("cronograma_atividades")
    op.drop_table("cronograma_preferencias")
