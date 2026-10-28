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
    conn = op.get_bind()

    def colunas(tabela: str) -> set[str]:
        return {
            coluna["name"]
            for coluna in sa.inspect(conn).get_columns(tabela)
        }

    def adicionar_se_faltar(tabela: str, coluna: sa.Column) -> None:
        if coluna.name not in colunas(tabela):
            op.add_column(tabela, coluna)

    # Horários e pausas: só cria as colunas ausentes.
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("inicio_hora", sa.String(5), nullable=True),
    )
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("fim_hora", sa.String(5), nullable=True),
    )
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("pausa_inicio", sa.String(5), nullable=True),
    )
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("pausa_fim", sa.String(5), nullable=True),
    )

    # JSON em TEXT: sem server_default para evitar incompatibilidades.
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("dias_semana_json", sa.Text(), nullable=True),
    )
    adicionar_se_faltar(
        "cronograma_preferencias",
        sa.Column("prioridades_json", sa.Text(), nullable=True),
    )

    adicionar_se_faltar(
        "cronograma_atividades",
        sa.Column("inicio_hora", sa.String(5), nullable=True),
    )

    # Preenche apenas valores nulos; os dados já existentes são preservados.
    conn.execute(sa.text("""
        UPDATE cronograma_preferencias
        SET inicio_hora = '13:00'
        WHERE inicio_hora IS NULL
    """))
    conn.execute(sa.text("""
        UPDATE cronograma_preferencias
        SET fim_hora = '17:00'
        WHERE fim_hora IS NULL
    """))
    conn.execute(sa.text("""
        UPDATE cronograma_preferencias
        SET dias_semana_json = '[0,1,2,3,4,5,6]'
        WHERE dias_semana_json IS NULL
    """))
    conn.execute(sa.text("""
        UPDATE cronograma_preferencias
        SET prioridades_json = '{}'
        WHERE prioridades_json IS NULL
    """))

    # Garante as restrições e os padrões das colunas obrigatórias.
    for nome, padrao in (
        ("inicio_hora", "13:00"),
        ("fim_hora", "17:00"),
    ):
        op.alter_column(
            "cronograma_preferencias",
            nome,
            existing_type=sa.String(5),
            nullable=False,
            server_default=padrao,
        )

    for nome in ("dias_semana_json", "prioridades_json"):
        op.alter_column(
            "cronograma_preferencias",
            nome,
            existing_type=sa.Text(),
            nullable=False,
        )


def downgrade() -> None:
    # Não remove colunas automaticamente: a migração pode ter encontrado
    # colunas preexistentes que pertencem a dados anteriores.
    pass
