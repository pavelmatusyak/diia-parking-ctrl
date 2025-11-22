"""add_violation_type_field

Revision ID: 6cee0a3bfe88
Revises: 68a22bf53d7b
Create Date: 2025-11-21 21:07:27.728290

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6cee0a3bfe88'
down_revision: Union[str, None] = '68a22bf53d7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('violations', sa.Column('violation_type', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('violations', 'violation_type')
