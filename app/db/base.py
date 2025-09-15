# Import all the models here for Alembic to pick them up
from app.db.session import Base
from app.db.models.user import User
from app.db.models.project import Project
from app.db.models.file import File
from app.db.models.ai_job import AIJob
from app.db.models.work_item import WorkItem

# This ensures all models are imported and available for Alembic migrations
