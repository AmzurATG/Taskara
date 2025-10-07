"""Add role column to users table

Revision ID: add_role_2b549428
Revises: 2aeca33cccd3
Create Date: 2025-09-25 22:50:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_role_2b549428'
down_revision = '2aeca33cccd3'
branch_labels = None
depends_on = None

# Define the enum
user_role_enum = postgresql.ENUM('user', 'admin', name='userrole')

def upgrade() -> None:
    # Create the enum type
    user_role_enum.create(op.get_bind(), checkfirst=True)
    
    # Add the role column to users table
    op.add_column('users', sa.Column('role', user_role_enum, nullable=True, server_default='user'))
    
    # Update existing users to have 'user' role
    op.execute("UPDATE users SET role = 'user' WHERE role IS NULL")

def downgrade() -> None:
    # Remove the role column
    op.drop_column('users', 'role')
    
    # Drop the enum type
    user_role_enum.drop(op.get_bind(), checkfirst=True)