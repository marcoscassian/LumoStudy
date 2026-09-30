"""award xp only for completed study activities

Revision ID: 0017
Revises: 0016
"""
from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tentativas_simulado",
        sa.Column("xp_processado", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "tentativas_simulado",
        sa.Column("xp_concedido", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "tentativas_simulado",
        sa.Column("xp_processado_em", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_tentativas_simulado_xp_processado",
        "tentativas_simulado",
        ["xp_processado"],
    )

    op.create_table(
        "tentativas_bloco",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("area", sa.String(length=50), nullable=False),
        sa.Column("iniciado_em", sa.DateTime(), nullable=False),
        sa.Column("finalizado_em", sa.DateTime(), nullable=True),
        sa.Column("total_questoes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("finalizada", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("xp_processado", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("xp_concedido", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_processado_em", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuarios.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    for coluna in ("usuario_id", "area", "finalizada", "xp_processado"):
        op.create_index(f"ix_tentativas_bloco_{coluna}", "tentativas_bloco", [coluna])

    op.create_table(
        "tentativa_bloco_questoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("tentativa_bloco_id", sa.Integer(), nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["tentativa_bloco_id"], ["tentativas_bloco.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tentativa_bloco_id", "questao_id", name="uq_bloco_questao"),
        sa.UniqueConstraint("tentativa_bloco_id", "ordem", name="uq_bloco_ordem"),
        mysql_engine="InnoDB",
        mysql_charset="utf8mb4",
    )
    op.create_index(
        "ix_tentativa_bloco_questoes_tentativa_bloco_id",
        "tentativa_bloco_questoes",
        ["tentativa_bloco_id"],
    )
    op.create_index(
        "ix_tentativa_bloco_questoes_questao_id",
        "tentativa_bloco_questoes",
        ["questao_id"],
    )

    op.add_column(
        "respostas_usuario",
        sa.Column("tentativa_bloco_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_respostas_usuario_tentativa_bloco_id",
        "respostas_usuario",
        ["tentativa_bloco_id"],
    )
    op.create_foreign_key(
        "fk_respostas_usuario_tentativa_bloco_id",
        "respostas_usuario",
        "tentativas_bloco",
        ["tentativa_bloco_id"],
        ["id"],
        ondelete="SET NULL",
    )
    # Versões anteriores não impediam o reenvio da mesma questão. Mantemos
    # a primeira resposta de cada tentativa antes de criar a garantia no banco.
    op.execute(
        sa.text(
            "DELETE duplicada FROM respostas_usuario AS duplicada "
            "INNER JOIN respostas_usuario AS original "
            "ON original.tentativa_simulado_id = duplicada.tentativa_simulado_id "
            "AND original.questao_id = duplicada.questao_id "
            "AND original.id < duplicada.id "
            "WHERE duplicada.tentativa_simulado_id IS NOT NULL"
        )
    )
    op.create_unique_constraint(
        "uq_resposta_simulado_questao",
        "respostas_usuario",
        ["tentativa_simulado_id", "questao_id"],
    )
    op.create_unique_constraint(
        "uq_resposta_bloco_questao",
        "respostas_usuario",
        ["tentativa_bloco_id", "questao_id"],
    )

    op.execute(
        sa.text(
            "UPDATE tentativas_simulado AS tentativa "
            "LEFT JOIN ("
            "SELECT tentativa_simulado_id, COUNT(*) AS quantidade "
            "FROM respostas_usuario WHERE tentativa_simulado_id IS NOT NULL "
            "GROUP BY tentativa_simulado_id"
            ") AS respostas ON respostas.tentativa_simulado_id = tentativa.id "
            "SET tentativa.xp_processado = TRUE, "
            "tentativa.xp_concedido = "
            "LEAST(COALESCE(respostas.quantidade, 0), tentativa.total_questoes) * 10, "
            "tentativa.xp_processado_em = tentativa.finalizado_em "
            "WHERE tentativa.finalizada = TRUE"
        )
    )
    op.execute(
        sa.text(
            "UPDATE usuarios AS usuario "
            "LEFT JOIN ("
            "SELECT usuario_id, SUM(xp_concedido) AS xp_total "
            "FROM tentativas_simulado WHERE xp_processado = TRUE GROUP BY usuario_id"
            ") AS historico ON historico.usuario_id = usuario.id "
            "SET usuario.xp = COALESCE(historico.xp_total, 0)"
        )
    )


def downgrade() -> None:
    op.drop_constraint("uq_resposta_bloco_questao", "respostas_usuario", type_="unique")
    op.drop_constraint("uq_resposta_simulado_questao", "respostas_usuario", type_="unique")
    op.drop_constraint(
        "fk_respostas_usuario_tentativa_bloco_id",
        "respostas_usuario",
        type_="foreignkey",
    )
    op.drop_index("ix_respostas_usuario_tentativa_bloco_id", table_name="respostas_usuario")
    op.drop_column("respostas_usuario", "tentativa_bloco_id")
    op.drop_table("tentativa_bloco_questoes")
    op.drop_table("tentativas_bloco")
    op.drop_index("ix_tentativas_simulado_xp_processado", table_name="tentativas_simulado")
    op.drop_column("tentativas_simulado", "xp_processado_em")
    op.drop_column("tentativas_simulado", "xp_concedido")
    op.drop_column("tentativas_simulado", "xp_processado")
