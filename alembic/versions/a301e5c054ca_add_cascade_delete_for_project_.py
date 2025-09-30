"""Add cascade delete for project relationships

Revision ID: a301e5c054ca
Revises: e5254db7f649
Create Date: 2025-09-17 11:31:27.803404

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a301e5c054ca'
down_revision = 'e5254db7f649'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add cascade delete constraints to project-related foreign keys
    
    # Drop existing foreign key constraints and recreate with CASCADE
    op.drop_constraint('files_project_id_fkey', 'files', type_='foreignkey')
    op.create_foreign_key('files_project_id_fkey', 'files', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    
    op.drop_constraint('ai_jobs_project_id_fkey', 'ai_jobs', type_='foreignkey')
    op.create_foreign_key('ai_jobs_project_id_fkey', 'ai_jobs', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    
    op.drop_constraint('work_items_project_id_fkey', 'work_items', type_='foreignkey')
    op.create_foreign_key('work_items_project_id_fkey', 'work_items', 'projects', ['project_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    # Restore original foreign key constraints without CASCADE
    
    op.drop_constraint('files_project_id_fkey', 'files', type_='foreignkey')
    op.create_foreign_key('files_project_id_fkey', 'files', 'projects', ['project_id'], ['id'])
    
    op.drop_constraint('ai_jobs_project_id_fkey', 'ai_jobs', type_='foreignkey')
    op.create_foreign_key('ai_jobs_project_id_fkey', 'ai_jobs', 'projects', ['project_id'], ['id'])
    
    op.drop_constraint('work_items_project_id_fkey', 'work_items', type_='foreignkey')
    op.create_foreign_key('work_items_project_id_fkey', 'work_items', 'projects', ['project_id'], ['id'])