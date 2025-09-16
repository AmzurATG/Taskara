from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.ai_job import AIJob, JobStatus
from app.schemas.ai_job import AIJobCreate, AIJobUpdate, AIJobResponse


class AIJobService:
    @staticmethod
    def create_ai_job(db: Session, job_data: AIJobCreate) -> AIJobResponse:
        """Create a new AI job for file processing."""
        db_job = AIJob(
            project_id=job_data.project_id,
            file_id=job_data.file_id,
            status=JobStatus.QUEUED,
            progress=0
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        return AIJobResponse.from_orm(db_job)

    @staticmethod
    def get_job(db: Session, job_id: UUID) -> Optional[AIJob]:
        """Get AI job by ID."""
        return db.query(AIJob).filter(AIJob.id == job_id).first()

    @staticmethod
    def get_project_jobs(db: Session, project_id: UUID) -> List[AIJob]:
        """Get all AI jobs for a project."""
        return db.query(AIJob).filter(AIJob.project_id == project_id).all()

    @staticmethod
    def get_file_job(db: Session, file_id: UUID) -> Optional[AIJob]:
        """Get AI job for a specific file."""
        return db.query(AIJob).filter(AIJob.file_id == file_id).first()

    @staticmethod
    def update_job_status(
        db: Session, 
        job_id: UUID, 
        status: JobStatus, 
        progress: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> Optional[AIJobResponse]:
        """Update AI job status and progress."""
        job = db.query(AIJob).filter(AIJob.id == job_id).first()
        
        if not job:
            return None
        
        job.status = status
        if progress is not None:
            job.progress = progress
        if error_message is not None:
            job.error_message = error_message
            
        db.commit()
        db.refresh(job)
        return AIJobResponse.from_orm(job)

    @staticmethod
    def get_queued_jobs(db: Session) -> List[AIJob]:
        """Get all queued jobs for background processing."""
        return db.query(AIJob).filter(AIJob.status == JobStatus.QUEUED).all()

    @staticmethod
    def mark_job_processing(db: Session, job_id: UUID) -> Optional[AIJobResponse]:
        """Mark job as processing."""
        return AIJobService.update_job_status(db, job_id, JobStatus.PROCESSING, progress=10)

    @staticmethod
    def mark_job_completed(db: Session, job_id: UUID) -> Optional[AIJobResponse]:
        """Mark job as completed."""
        return AIJobService.update_job_status(db, job_id, JobStatus.DONE, progress=100)

    @staticmethod
    def mark_job_failed(db: Session, job_id: UUID, error_message: str) -> Optional[AIJobResponse]:
        """Mark job as failed with error message."""
        return AIJobService.update_job_status(
            db, job_id, JobStatus.FAILED, error_message=error_message
        )