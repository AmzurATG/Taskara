from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File as FastAPIFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.file_processing import FileService
from app.services.work_item import WorkItemService
from app.schemas.file import File, FileUploadResponse
from app.schemas.work_item import WorkItemResponse
from app.core.security import get_current_user
from app.db.models.user import User

router = APIRouter()


@router.post("/projects/{project_id}/files/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: UUID,
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a requirements document (PDF/DOCX) to a project."""
    return await FileService.upload_file(
        db=db, 
        project_id=project_id, 
        file=file, 
        user_id=current_user.id
    )


@router.get("/projects/{project_id}/files", response_model=List[File])
def get_project_files(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all files for a project."""
    return FileService.get_project_files(
        db=db, 
        project_id=project_id, 
        user_id=current_user.id
    )


@router.get("/files/{file_id}", response_model=File)
def get_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific file by ID."""
    file = FileService.get_file(
        db=db, 
        file_id=file_id, 
        user_id=current_user.id
    )
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return file


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a file."""
    success = FileService.delete_file(
        db=db,
        file_id=file_id,
        user_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return {"message": "File deleted successfully"}


@router.get("/files/{file_id}/work-items", response_model=List[WorkItemResponse])
def get_file_work_items(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all work items generated from a specific file."""
    # First verify the user has access to this file
    file = FileService.get_file(db=db, file_id=file_id, user_id=current_user.id)
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Get work items for this file
    work_items = WorkItemService.get_work_items_by_file(db=db, file_id=file_id)
    return work_items
