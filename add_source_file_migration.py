"""Add source_file_id to work_items table

This migration adds a source_file_id field to track which file was used to generate each work item.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

def upgrade():
    # Add source_file_id column to work_items table
    op.add_column('work_items', sa.Column('source_file_id', UUID(as_uuid=True), nullable=True))
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_work_items_source_file_id',
        'work_items',
        'files',
        ['source_file_id'],
        ['id']
    )

def downgrade():
    # Remove foreign key constraint
    op.drop_constraint('fk_work_items_source_file_id', 'work_items', type_='foreignkey')
    
    # Remove column
    op.drop_column('work_items', 'source_file_id')