"""add source_file_id to work_items and file metadata

Revision ID: b456c78d9012
Revises: a301e5c054ca
Create Date: 2025-09-29 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b456c78d9012'
down_revision = 'a301e5c054ca'
branch_labels = None
depends_on = None


def upgrade():
    """Add source_file_id to work_items table and file_hash to files table."""
    
    # Add source_file_id to work_items table
    op.add_column('work_items', 
        sa.Column('source_file_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_work_items_source_file_id', 
        'work_items', 
        'files', 
        ['source_file_id'], 
        ['id'],
        ondelete='SET NULL'  # If file is deleted, set source_file_id to NULL
    )
    
    # Add file_hash to files table for duplicate detection
    op.add_column('files',
        sa.Column('file_hash', sa.String(64), nullable=True)  # SHA-256 hash
    )
    
    # Add file_size to files table for additional metadata
    op.add_column('files',
        sa.Column('file_size', sa.BigInteger, nullable=True)
    )
    
    # Create index for efficient duplicate checking
    op.create_index(
        'idx_files_project_hash',
        'files',
        ['project_id', 'file_hash'],
        unique=False
    )


def downgrade():
    """Remove the added columns and constraints."""
    
    # Drop the index
    op.drop_index('idx_files_project_hash', table_name='files')
    
    # Drop foreign key constraint
    op.drop_constraint('fk_work_items_source_file_id', 'work_items', type_='foreignkey')
    
    # Drop columns
    op.drop_column('work_items', 'source_file_id')
    op.drop_column('files', 'file_hash')
    op.drop_column('files', 'file_size')