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
        
        # Try to trigger background processing, but handle Redis connection errors gracefully
        try:
            from app.tasks.ai_jobs import process_ai_job
            process_ai_job.delay(str(db_job.id))
        except Exception as e:
            # If Celery/Redis is not available, persist the error and keep job in QUEUED status
            error_msg = f"Background task scheduling failed: {str(e)}. Job created but not scheduled for background processing."
            print(f"Warning: {error_msg}")
            print(f"Job {db_job.id} created but not scheduled for background processing")
            
            # Update the job with the error message but keep it in QUEUED status
            # This allows manual retry or alternative processing later
            db_job.error_message = error_msg
            db.commit()
            db.refresh(db_job)
        
        return AIJobResponse.from_orm(db_job)

    @staticmethod
    def create_ai_job_minimal(db: Session, job_data: AIJobCreate) -> AIJobResponse:
        """Create a new AI job for minimal file processing (max 10 work items)."""
        db_job = AIJob(
            project_id=job_data.project_id,
            file_id=job_data.file_id,
            status=JobStatus.QUEUED,
            progress=0
        )
        db.add(db_job)
        db.commit()
        db.refresh(db_job)
        
        # Try to trigger background processing with minimal flag
        try:
            from app.tasks.ai_jobs import process_ai_job_minimal
            process_ai_job_minimal.delay(str(db_job.id))
        except Exception as e:
            # If Celery/Redis is not available, persist the error and keep job in QUEUED status
            error_msg = f"Background task scheduling failed: {str(e)}. Minimal job created but not scheduled for background processing."
            print(f"Warning: {error_msg}")
            print(f"Minimal job {db_job.id} created but not scheduled for background processing")
            
            # Update the job with the error message but keep it in QUEUED status
            # This allows manual retry or alternative processing later
            db_job.error_message = error_msg
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

    @staticmethod
    def retry_job(db: Session, job_id: UUID) -> Optional[AIJobResponse]:
        """Retry a failed or queued job by attempting to schedule it again."""
        job = db.query(AIJob).filter(AIJob.id == job_id).first()
        
        if not job:
            return None
            
        if job.status not in [JobStatus.FAILED, JobStatus.QUEUED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot retry job with status: {job.status.value}"
            )
        
        # Clear error message and reset to QUEUED status
        job.status = JobStatus.QUEUED
        job.progress = 0
        job.error_message = None
        db.commit()
        db.refresh(job)
        
        # Try to schedule the job again
        try:
            from app.tasks.ai_jobs import process_ai_job
            process_ai_job.delay(str(job.id))
            print(f"Job {job.id} successfully rescheduled for background processing")
        except Exception as e:
            # If scheduling fails again, persist the new error
            error_msg = f"Job retry failed: {str(e)}. Background task scheduling still unavailable."
            print(f"Warning: {error_msg}")
            job.error_message = error_msg
            db.commit()
            db.refresh(job)
        
        return AIJobResponse.from_orm(job)

    @staticmethod
    def get_failed_scheduling_jobs(db: Session) -> List[AIJob]:
        """Get all jobs that failed to be scheduled (QUEUED status with error_message)."""
        return db.query(AIJob).filter(
            AIJob.status == JobStatus.QUEUED,
            AIJob.error_message.isnot(None)
        ).all()