"""add_new_violation_flow_fields

Revision ID: 68a22bf53d7b
Revises: 4bc7b0b1fe17
Create Date: 2025-11-16 20:02:34.408339

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68a22bf53d7b'
down_revision: Union[str, None] = '4bc7b0b1fe17'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('violations', sa.Column('violation_reason', sa.String(length=500), nullable=True))
    op.add_column('violations', sa.Column('violation_code', sa.String(length=50), nullable=True))
    op.add_column('violations', sa.Column('timer_started_at', sa.DateTime(), nullable=True))
    op.add_column('violations', sa.Column('has_road_sign_photo', sa.Boolean(), nullable=False, server_default='false'))

    op.drop_table('conversation_messages')
    op.drop_table('conversations')


def downgrade() -> None:
    op.create_table('conversations',
        sa.Column('id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('user_id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('violation_id', sa.VARCHAR(length=36), nullable=True),
        sa.Column('status', sa.VARCHAR(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['violation_id'], ['violations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('conversation_messages',
        sa.Column('id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('conversation_id', sa.VARCHAR(length=36), nullable=False),
        sa.Column('role', sa.VARCHAR(length=20), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('tool_calls', sa.JSON(), nullable=True),
        sa.Column('tool_results', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    op.drop_column('violations', 'has_road_sign_photo')
    op.drop_column('violations', 'timer_started_at')
    op.drop_column('violations', 'violation_code')
    op.drop_column('violations', 'violation_reason')
