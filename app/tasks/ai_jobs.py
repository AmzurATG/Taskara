import logging
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal

# Import models in the correct order to avoid relationship issues
from app.db.models.user import User
from app.db.models.project import Project
from app.db.models.file import File
from app.db.models.work_item import WorkItem
from app.db.models.ai_job import AIJob, JobStatus

from app.services.ai import AIParser
from app.services.work_item import WorkItemService
from app.utils.pdf_utils import PDFExtractor
from app.utils.docx_utils import DOCXExtractor

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=3)
def process_ai_job(self, job_id: str):
    """Process an AI job in the background."""
    db = SessionLocal()
    job_uuid = UUID(job_id)
    
    try:
        # Get the AI job
        ai_job = db.query(AIJob).filter(AIJob.id == job_uuid).first()
        if not ai_job:
            logger.error(f"AI job {job_id} not found")
            return {"status": "failed", "error": "Job not found"}
        
        # Update job status to processing
        ai_job.status = JobStatus.PROCESSING
        ai_job.progress = 10
        db.commit()
        
        # Get the associated file
        file_record = db.query(File).filter(File.id == ai_job.file_id).first()
        if not file_record:
            logger.error(f"File {ai_job.file_id} not found for job {job_id}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = "Associated file not found"
            db.commit()
            return {"status": "failed", "error": "File not found"}
        
        # Extract text from file
        logger.info(f"Extracting text from file: {file_record.file_name}")
        ai_job.progress = 30
        db.commit()
        
        try:
            # Determine file type from extension
            file_extension = file_record.file_name.lower().split('.')[-1] if '.' in file_record.file_name else ''
            file_type = None
            
            if file_extension == 'pdf':
                file_type = "application/pdf"
            elif file_extension in ['docx', 'doc']:
                file_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            elif file_extension == 'txt':
                file_type = "text/plain"
            else:
                raise ValueError(f"Unsupported file extension: {file_extension}")
            
            text_content = extract_text_from_file(file_record.storage_path, file_type)
            if not text_content or len(text_content.strip()) < 50:
                raise ValueError("Insufficient text content extracted from file")
                
        except Exception as e:
            logger.error(f"Text extraction failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Text extraction failed: {str(e)}"
            db.commit()
            return {"status": "failed", "error": str(e)}
        
        # Parse content with AI
        logger.info(f"Processing text with AI for job {job_id}")
        ai_job.progress = 60
        db.commit()
        
        try:
            ai_service = AIParser()
            parsed_results = ai_service.parse_requirements_document(text_content)
            
            if not parsed_results:
                raise ValueError("AI parsing returned no results")
                
        except Exception as e:
            logger.error(f"AI parsing failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"AI parsing failed: {str(e)}"
            db.commit()
            
            # Retry with exponential backoff
            if self.request.retries < self.max_retries:
                logger.info(f"Retrying job {job_id}, attempt {self.request.retries + 1}")
                raise self.retry(countdown=60 * (2 ** self.request.retries))
            
            return {"status": "failed", "error": str(e)}
        
        # Create work items
        logger.info(f"Creating work items for job {job_id}")
        ai_job.progress = 80
        db.commit()
        
        try:
            work_items = WorkItemService.create_work_items_with_hierarchy(
                db, parsed_results, ai_job.project_id
            )
            
            if not work_items:
                raise ValueError("No work items were created")
                
        except Exception as e:
            logger.error(f"Work item creation failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Work item creation failed: {str(e)}"
            db.commit()
            return {"status": "failed", "error": str(e)}
        
        # Update job with completion
        ai_job.status = JobStatus.DONE
        ai_job.progress = 100
        # Note: result field doesn't exist in current schema, so storing in error_message for now
        ai_job.error_message = f"COMPLETED: Created {len(work_items)} work items from {len(parsed_results)} sections"
        db.commit()
        
        logger.info(f"Successfully completed AI job {job_id}, created {len(work_items)} work items")
        
        return {
            "status": "done",
            "job_id": job_id,
            "work_items_created": len(work_items),
            "parsed_sections": len(parsed_results)
        }
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        
        # Update job status
        ai_job = db.query(AIJob).filter(AIJob.id == job_uuid).first()
        if ai_job:
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Unexpected error: {str(e)}"
            db.commit()
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


def extract_text_from_file(file_path: str, file_type: str) -> str:
    """Extract text content from uploaded file."""
    try:
        if file_type == "application/pdf":
            return PDFExtractor.extract_text_from_pdf(file_path)
        elif file_type in ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]:
            return DOCXExtractor.extract_text_from_docx(file_path)
        elif file_type == "text/plain":
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
            
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {str(e)}")
        raise


@celery_app.task
def cleanup_old_jobs():
    """Clean up old completed/failed jobs."""
    db = SessionLocal()
    try:
        # This is a maintenance task to clean up old jobs
        # You can implement retention policies here
        logger.info("Job cleanup task executed")
        
    finally:
        db.close()
