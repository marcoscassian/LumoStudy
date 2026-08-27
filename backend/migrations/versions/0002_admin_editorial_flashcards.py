"""catalogo de provas/questoes, painel editorial e flashcards

Revision ID: 0002
Revises: 0001
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "usuarios",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "areas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_areas_slug"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_areas_slug", "areas", ["slug"], unique=True)

    op.create_table(
        "temas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("area_id", "slug", name="uq_tema_area_slug"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_temas_area_id", "temas", ["area_id"])
    op.create_index("ix_temas_ativo", "temas", ["ativo"])

    op.create_table(
        "provas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("codigo", sa.String(length=30), nullable=False),
        sa.Column("nome", sa.String(length=150), nullable=False),
        sa.Column("ano", sa.Integer(), nullable=False),
        sa.Column("ativa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("codigo", name="uq_provas_codigo"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    op.create_index("ix_provas_codigo", "provas", ["codigo"], unique=True)
    op.create_index("ix_provas_ano", "provas", ["ano"])
    op.create_index("ix_provas_ativa", "provas", ["ativa"])

    op.create_table(
        "questoes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("prova_id", sa.Integer(), nullable=False),
        sa.Column("numero", sa.String(length=30), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=False),
        sa.Column("tema_id", sa.Integer(), nullable=True),
        sa.Column("disciplina", sa.String(length=100), nullable=True),
        sa.Column("nivel", sa.String(length=20), nullable=False, server_default="medio"),
        sa.Column("caminho_json", sa.String(length=255), nullable=False),
        sa.Column("ativa", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.ForeignKeyConstraint(["prova_id"], ["provas.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["tema_id"], ["temas.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("prova_id", "numero", name="uq_questao_prova_numero"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("prova_id", "numero", "area_id", "tema_id", "disciplina", "nivel", "ativa"):
        op.create_index(f"ix_questoes_{coluna}", "questoes", [coluna])

    op.create_table(
        "questoes_editoriais",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=False),
        sa.Column("resolucao", sa.Text(), nullable=True),
        sa.Column("disciplina", sa.String(length=100), nullable=True),
        sa.Column("conteudo_principal", sa.String(length=150), nullable=True),
        sa.Column("atualizado_por", sa.Integer(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["atualizado_por"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("questao_id", name="uq_questoes_editoriais_questao_id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("questao_id", "disciplina", "conteudo_principal", "atualizado_por"):
        op.create_index(f"ix_questoes_editoriais_{coluna}", "questoes_editoriais", [coluna])

    op.create_table(
        "flashcards",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("frente", sa.Text(), nullable=False),
        sa.Column("verso", sa.Text(), nullable=False),
        sa.Column("disciplina", sa.String(length=100), nullable=False),
        sa.Column("conteudo_principal", sa.String(length=150), nullable=False),
        sa.Column("questao_id", sa.Integer(), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("criado_por", sa.Integer(), nullable=True),
        sa.Column("criado_em", sa.DateTime(), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["questao_id"], ["questoes.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["criado_por"], ["usuarios.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        mysql_engine="InnoDB", mysql_charset="utf8mb4",
    )
    for coluna in ("disciplina", "conteudo_principal", "questao_id", "ativo", "criado_por"):
        op.create_index(f"ix_flashcards_{coluna}", "flashcards", [coluna])


def downgrade() -> None:
    op.drop_table("flashcards")
    op.drop_table("questoes_editoriais")
    op.drop_table("questoes")
    op.drop_table("provas")
    op.drop_table("temas")
    op.drop_table("areas")
    op.drop_column("usuarios", "is_admin")
