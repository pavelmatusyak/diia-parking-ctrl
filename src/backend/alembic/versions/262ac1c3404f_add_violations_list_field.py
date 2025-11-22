"""add_violations_list_field

Revision ID: 262ac1c3404f
Revises: 6cee0a3bfe88
Create Date: 2025-11-22 12:04:51.353868

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '262ac1c3404f'
down_revision: Union[str, None] = '6cee0a3bfe88'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('violations', sa.Column('violations', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('violations', 'violations')
