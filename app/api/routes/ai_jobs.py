from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.ai_job import AIJobService
from app.schemas.ai_job import AIJobResponse, AIJobCreate
from app.core.security import get_current_user
from app.db.models.user import User
from app.services.project import ProjectService

router = APIRouter()


@router.get("/{project_id}/jobs", response_model=List[AIJobResponse])
def get_project_ai_jobs(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all AI jobs for a project."""
    # Verify project ownership
    if not ProjectService.verify_project_ownership(db, project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    jobs = AIJobService.get_project_jobs(db, project_id)
    return [AIJobResponse.from_orm(job) for job in jobs]


@router.post("/files/{file_id}/reprocess-minimal", response_model=AIJobResponse, status_code=status.HTTP_201_CREATED)
def reprocess_file_minimal(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reprocess a file with ultra-minimal parsing (max 10 work items)."""
    # Get the file to verify ownership and get project_id
    from app.services.file_processing import FileService
    file_record = FileService.get_file(db, file_id, current_user.id)
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied"
        )
    
    # Create a new AI job for minimal processing
    ai_job = AIJobService.create_ai_job_minimal(
        db=db,
        job_data=AIJobCreate(
            project_id=file_record.project_id,
            file_id=file_id
        )
    )
    
    return ai_job


@router.get("/jobs/{job_id}", response_model=AIJobResponse)
def get_ai_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI job status and progress."""
    job = AIJobService.get_job(db, job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI job not found"
        )
    
    # Verify project ownership through the job's project
    if not ProjectService.verify_project_ownership(db, job.project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access denied"
        )
    
    return AIJobResponse.from_orm(job)


@router.get("/files/{file_id}/job", response_model=AIJobResponse)
def get_file_ai_job(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI job for a specific file."""
    job = AIJobService.get_file_job(db, file_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI job found for this file"
        )
    
    # Verify project ownership through the job's project
    if not ProjectService.verify_project_ownership(db, job.project_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access denied"
        )
    
    return AIJobResponse.from_orm(job)
