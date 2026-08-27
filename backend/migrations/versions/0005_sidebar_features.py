"""loja, modo escuro e configuracao de simulados

Revision ID: 0005
Revises: 0004
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("modo_escuro", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.add_column("simulados", sa.Column("dia_prova", sa.Integer(), nullable=True))
    op.add_column("simulados", sa.Column("quantidade_questoes", sa.Integer(), nullable=True))
    op.create_index("ix_simulados_dia_prova", "simulados", ["dia_prova"])
    op.create_index("ix_simulados_quantidade_questoes", "simulados", ["quantidade_questoes"])

    op.create_table(
        "itens_loja",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=80), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("descricao", sa.String(length=255), nullable=True),
        sa.Column("preco_coins", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("arquivo", sa.String(length=255), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False, server_default="avatar"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("nome"),
        sa.UniqueConstraint("slug"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_itens_loja_nome", "itens_loja", ["nome"])
    op.create_index("ix_itens_loja_slug", "itens_loja", ["slug"])
    op.create_index("ix_itens_loja_tipo", "itens_loja", ["tipo"])
    op.create_index("ix_itens_loja_ativo", "itens_loja", ["ativo"])

    op.create_table(
        "usuario_itens",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("comprado_em", sa.DateTime(), nullable=False),
        sa.Column("equipado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["itens_loja.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("usuario_id", "item_id", name="uq_usuario_item"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_usuario_itens_usuario_id", "usuario_itens", ["usuario_id"])
    op.create_index("ix_usuario_itens_item_id", "usuario_itens", ["item_id"])
    op.create_index("ix_usuario_itens_equipado", "usuario_itens", ["equipado"])


def downgrade() -> None:
    op.drop_table("usuario_itens")
    op.drop_table("itens_loja")
    op.drop_index("ix_simulados_quantidade_questoes", table_name="simulados")
    op.drop_index("ix_simulados_dia_prova", table_name="simulados")
    op.drop_column("simulados", "quantidade_questoes")
    op.drop_column("simulados", "dia_prova")
    op.drop_column("usuarios", "modo_escuro")
