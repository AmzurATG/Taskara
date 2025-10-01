from typing import List, Optional, Dict, Any
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
    def get_user_projects(db: Session, user_id: UUID, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Project]:
        """Get all projects for a user with pagination. By default, only returns active projects."""
        query = db.query(Project).filter(Project.owner_id == user_id)
        
        if not include_inactive:
            query = query.filter(Project.active == True)
            
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_project_view_details(db: Session, project_id: UUID, user_id: UUID) -> Optional[Dict[str, Any]]:
        """Get project details with hierarchical structure for viewing."""
        # Get the project
        project = ProjectService.get_project(db, project_id, user_id)
        if not project:
            return None
        
        # Import here to avoid circular imports
        from app.db.models.work_item import WorkItem, ItemType
        
        # Get all active epics for this project
        epics = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.item_type == ItemType.EPIC,
            WorkItem.parent_id == None,
            WorkItem.active == True
        ).order_by(WorkItem.order_index, WorkItem.created_at).all()
        
        # Build epics data with counts
        epics_data = []
        for epic in epics:
            # Count active user stories under this epic
            user_stories_count = db.query(WorkItem).filter(
                WorkItem.parent_id == epic.id,
                WorkItem.item_type == ItemType.STORY,
                WorkItem.active == True
            ).count()
            
            epic_data = {
                "id": str(epic.id),
                "title": epic.title,
                "description": epic.description,
                "status": epic.status.value,
                "priority": epic.priority.value,
                "estimated_hours": epic.estimated_hours,
                "created_at": epic.created_at.isoformat(),
                "user_stories_count": user_stories_count
            }
            epics_data.append(epic_data)
        
        # Get work items summary
        total_items = db.query(WorkItem).filter(WorkItem.project_id == project_id).count()
        epics_count = len(epics_data)
        stories_count = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.item_type == ItemType.STORY
        ).count()
        tasks_count = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.item_type == ItemType.TASK
        ).count()
        subtasks_count = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.item_type == ItemType.SUBTASK
        ).count()
        
        # Get inactive work items count
        inactive_items_count = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.active == False
        ).count()
        
        work_items_summary = {
            "total_items": total_items,
            "epics_count": epics_count,
            "stories_count": stories_count,
            "tasks_count": tasks_count,
            "subtasks_count": subtasks_count,
            "inactive_items_count": inactive_items_count
        }
        
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "owner_id": project.owner_id,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "epics": epics_data,
            "work_items_summary": work_items_summary
        }

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
    def toggle_project_active_status(db: Session, project_id: UUID, user_id: UUID, active: bool) -> Optional[Project]:
        """Toggle project active status and cascade to all work items."""
        try:
            # Get the project
            project = ProjectService.get_project(db, project_id, user_id)
            if not project:
                return None
            
            # Update project status
            project.active = active
            
            # Cascade to all work items in this project
            from app.db.models.work_item import WorkItem
            db.query(WorkItem).filter(
                WorkItem.project_id == project_id
            ).update({"active": active})
            
            db.commit()
            db.refresh(project)
            return project
            
        except Exception as e:
            db.rollback()
            raise e

    @staticmethod
    def verify_project_ownership(db: Session, project_id: UUID, user_id: UUID) -> bool:
        """Verify that a project belongs to the given user."""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        return project is not None