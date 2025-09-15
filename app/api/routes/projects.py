from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.project import ProjectService
from app.schemas.project import Project, ProjectCreate, ProjectUpdate
from app.core.security import get_current_user
from app.db.models.user import User

router = APIRouter()


@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project."""
    return ProjectService.create_project(db=db, project=project, user_id=current_user.id)


@router.get("/", response_model=List[Project])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all projects for the current user."""
    return ProjectService.get_user_projects(db=db, user_id=current_user.id, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=Project)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project by ID."""
    project = ProjectService.get_project(db=db, project_id=project_id, user_id=current_user.id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.put("/{project_id}", response_model=Project)
def update_project(
    project_id: UUID,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a project."""
    project = ProjectService.update_project(
        db=db, 
        project_id=project_id, 
        project_update=project_update, 
        user_id=current_user.id
    )
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a project."""
    success = ProjectService.delete_project(db=db, project_id=project_id, user_id=current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
