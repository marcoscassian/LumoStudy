"""remove the question link from flashcards

Revision ID: 0016
Revises: 0015
"""
from alembic import op
import sqlalchemy as sa

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())
    for foreign_key in inspector.get_foreign_keys("flashcards"):
        if "questao_id" in foreign_key["constrained_columns"]:
            op.drop_constraint(foreign_key["name"], "flashcards", type_="foreignkey")
            break
    op.drop_index("ix_flashcards_questao_id", table_name="flashcards")
    op.drop_column("flashcards", "questao_id")


def downgrade() -> None:
    op.add_column("flashcards", sa.Column("questao_id", sa.Integer(), nullable=True))
    op.create_index("ix_flashcards_questao_id", "flashcards", ["questao_id"])
    op.create_foreign_key(
        "fk_flashcards_questao_id_questoes",
        "flashcards",
        "questoes",
        ["questao_id"],
        ["id"],
        ondelete="SET NULL",
    )
