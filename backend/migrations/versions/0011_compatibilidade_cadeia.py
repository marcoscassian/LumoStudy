"""Restore Alembic revision chain after the missing 0011 revision.

Revision ID: 0011
Revises: 0010
"""

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This revision is intentionally a no-op. The original 0011 migration is
    # absent from the repository, but the later revisions already depend on it.
    # Creating this placeholder keeps the migration chain consistent and prevents
    # Alembic from warning about a missing parent revision.
    pass


def downgrade() -> None:
    pass
