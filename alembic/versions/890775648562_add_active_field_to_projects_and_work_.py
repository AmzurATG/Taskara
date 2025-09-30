"""add_active_field_to_projects_and_work_items

Revision ID: 890775648562
Revises: b456c78d9012
Create Date: 2025-09-30 10:04:42.182297

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '890775648562'
down_revision = 'b456c78d9012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add active column to projects table
    op.add_column('projects', sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()))
    
    # Add active column to work_items table
    op.add_column('work_items', sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    # Remove active column from work_items table
    op.drop_column('work_items', 'active')
    
    # Remove active column from projects table
    op.drop_column('projects', 'active')