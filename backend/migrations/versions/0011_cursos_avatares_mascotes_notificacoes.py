"""cursos, identidade por casa, mascotes e notificacoes

Revision ID: 0011
Revises: 0010
"""

from alembic import op
import sqlalchemy as sa

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("curso", sa.String(length=30), nullable=False, server_default="informatica"),
    )
    op.create_index("ix_usuarios_curso", "usuarios", ["curso"])
    op.create_index("ix_usuarios_casa", "usuarios", ["casa"])
    op.add_column(
        "usuarios",
        sa.Column("mascote_slug", sa.String(length=50), nullable=False, server_default="coruja"),
    )
    op.add_column(
        "usuarios",
        sa.Column(
            "mascote_url",
            sa.String(length=255),
            nullable=False,
            server_default="/sprites/mascotes/coruja.png",
        ),
    )

    op.create_table(
        "notificacoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("titulo", sa.String(length=120), nullable=False),
        sa.Column("mensagem", sa.Text(), nullable=False),
        sa.Column("tipo", sa.String(length=30), nullable=False, server_default="geral"),
        sa.Column("rota", sa.String(length=255), nullable=True),
        sa.Column("lida", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("criada_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index("ix_notificacoes_usuario_id", "notificacoes", ["usuario_id"])
    op.create_index("ix_notificacoes_tipo", "notificacoes", ["tipo"])
    op.create_index("ix_notificacoes_lida", "notificacoes", ["lida"])
    op.create_index("ix_notificacoes_criada_em", "notificacoes", ["criada_em"])


def downgrade() -> None:
    op.drop_table("notificacoes")
    op.drop_column("usuarios", "mascote_url")
    op.drop_column("usuarios", "mascote_slug")
    op.drop_index("ix_usuarios_casa", table_name="usuarios")
    op.drop_index("ix_usuarios_curso", table_name="usuarios")
    op.drop_column("usuarios", "curso")
