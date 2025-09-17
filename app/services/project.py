from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    @staticmethod
    def create_project(db: Session, project: ProjectCreate, user_id: UUID) -> Project:
        """Create a new project for the given user."""
        db_project = Project(
            name=project.name,
            description=project.description,
            owner_id=user_id
        )
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project

    @staticmethod
    def get_project(db: Session, project_id: UUID, user_id: UUID) -> Optional[Project]:
        """Get a project by ID, ensuring it belongs to the user."""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        return project

    @staticmethod
    def get_user_projects(db: Session, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Project]:
        """Get all projects for a user with pagination."""
        return db.query(Project).filter(
            Project.owner_id == user_id
        ).offset(skip).limit(limit).all()

    @staticmethod
    def update_project(db: Session, project_id: UUID, project_update: ProjectUpdate, user_id: UUID) -> Optional[Project]:
        """Update a project, ensuring it belongs to the user."""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        
        if not project:
            return None
            
        update_data = project_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
            
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete_project(db: Session, project_id: UUID, user_id: UUID) -> bool:
        """Delete a project and all related data, ensuring it belongs to the user."""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        
        if not project:
            return False
        
        try:
            # Import here to avoid circular imports
            from app.db.models.file import File
            
            # Delete physical files from storage before deleting project
            # (Database cascade will handle the database records)
            files = db.query(File).filter(File.project_id == project_id).all()
            for file in files:
                try:
                    import os
                    if file.storage_path and os.path.exists(file.storage_path):
                        os.remove(file.storage_path)
                except Exception as e:
                    print(f"Warning: Could not delete physical file {file.storage_path}: {e}")
            
            # Delete the project - database cascade will automatically delete:
            # - All work_items related to this project
            # - All ai_jobs related to this project  
            # - All files related to this project
            db.delete(project)
            
            # Commit all changes
            db.commit()
            return True
            
        except Exception as e:
            # Rollback on any error
            db.rollback()
            print(f"Error deleting project {project_id}: {e}")
            return False

    @staticmethod
    def verify_project_ownership(db: Session, project_id: UUID, user_id: UUID) -> bool:
        """Verify that a project belongs to the given user."""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        return project is not None