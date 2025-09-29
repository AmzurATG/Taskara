import logging
from typing import Dict, Any, List
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.db.session import SessionLocal

# Import all models to ensure proper relationship configuration
from app.db.base import *
from app.db.models.ai_job import AIJob, JobStatus
from app.db.models.file import File

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
    db = None
    job_uuid = UUID(job_id)
    
    try:
        # Create database session with error handling
        db = SessionLocal()
        
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
        
        # Parse content with AI using two-pass approach
        logger.info(f"Processing text with AI for job {job_id} using two-pass approach")
        ai_job.progress = 60
        db.commit()
        
        try:
            ai_service = AIParser()
            # Use the new two-pass parsing method
            parsed_results = ai_service.parse_requirements_document_two_pass(text_content)
            
            if not parsed_results:
                raise ValueError("AI parsing returned no results")
            
            # Log the two-pass results
            total_work_items = sum(len(result.get("work_items", [])) for result in parsed_results)
            logger.info(f"📊 Two-pass parsing completed for {file_record.file_name}:")
            logger.info(f"   📄 Generated {len(parsed_results)} result sections")
            logger.info(f"   📊 Total work items: {total_work_items}")
                
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
        logger.info(f"Creating work items for job {job_id} from file: {file_record.file_name}")
        ai_job.progress = 80
        db.commit()
        
        try:
            work_items = WorkItemService.create_work_items_with_hierarchy(
                db, parsed_results, ai_job.project_id, file_record.file_name, ai_job.file_id
            )
            
            if not work_items:
                raise ValueError("No work items were created")
            
            # Log detailed breakdown of created work items
            type_breakdown = {
                'epics': len([item for item in work_items if item.item_type.value == 'epic']),
                'stories': len([item for item in work_items if item.item_type.value == 'story']),
                'tasks': len([item for item in work_items if item.item_type.value == 'task']),
                'subtasks': len([item for item in work_items if item.item_type.value == 'subtasks'])
            }
            
            logger.info(f"📊 Work items created for file '{file_record.file_name}':")
            logger.info(f"   📖 Epics: {type_breakdown['epics']}")
            logger.info(f"   📝 Stories: {type_breakdown['stories']}")
            logger.info(f"   ⚡ Tasks: {type_breakdown['tasks']}")
            logger.info(f"   🔧 Subtasks: {type_breakdown['subtasks']}")
            logger.info(f"   📊 Total: {len(work_items)} work items")
                
        except Exception as e:
            logger.error(f"Work item creation failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Work item creation failed: {str(e)}"
            db.commit()
            return {"status": "failed", "error": str(e)}
        
        # Index document for RAG (chatbot functionality)
        logger.info(f"Indexing document for RAG: {file_record.file_name}")
        ai_job.progress = 90
        db.commit()
        
        try:
            from app.services.rag_service import rag_service
            index_success = rag_service.index_document(
                db=db,
                file_id=ai_job.file_id,
                user_id=file_record.uploaded_by
            )
            
            if index_success:
                logger.info(f"✅ Successfully indexed document for RAG: {file_record.file_name}")
            else:
                logger.warning(f"⚠️ Failed to index document for RAG: {file_record.file_name}")
                
        except Exception as e:
            logger.error(f"RAG indexing failed for job {job_id}: {str(e)}")
            # Don't fail the entire job if RAG indexing fails, just log the warning
            logger.warning(f"⚠️ Document processing completed but RAG indexing failed: {str(e)}")
        
        # Update job with completion
        ai_job.status = JobStatus.DONE
        ai_job.progress = 100
        
        # Create detailed completion message with breakdown
        type_breakdown = {
            'epics': len([item for item in work_items if item.item_type.value == 'epic']),
            'stories': len([item for item in work_items if item.item_type.value == 'story']),
            'tasks': len([item for item in work_items if item.item_type.value == 'task']),
            'subtasks': len([item for item in work_items if item.item_type.value == 'subtask'])
        }
        
        completion_message = f"COMPLETED: Created {len(work_items)} work items from {len(parsed_results)} sections of file '{file_record.file_name}'. Breakdown: {type_breakdown['epics']} epics, {type_breakdown['stories']} stories, {type_breakdown['tasks']} tasks, {type_breakdown['subtasks']} subtasks"
        ai_job.error_message = completion_message
        db.commit()
        
        logger.info(f"✅ Successfully completed AI job {job_id} for file '{file_record.file_name}'")
        logger.info(f"📊 Final results: {completion_message}")
        
        return {
            "status": "done",
            "job_id": job_id,
            "file_name": file_record.file_name,
            "work_items_created": len(work_items),
            "parsed_sections": len(parsed_results),
            "type_breakdown": type_breakdown
        }
        
    except Exception as e:
        logger.error(f"Unexpected error processing job {job_id}: {str(e)}")
        
        # Update job status with proper error handling
        try:
            if db:
                ai_job = db.query(AIJob).filter(AIJob.id == job_uuid).first()
                if ai_job:
                    ai_job.status = JobStatus.FAILED
                    ai_job.error_message = f"Unexpected error: {str(e)}"
                    db.commit()
        except Exception as db_error:
            logger.error(f"Failed to update job status: {db_error}")
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        if db:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Error closing database session: {close_error}")


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


@celery_app.task(bind=True, max_retries=3)
def process_ai_job_minimal(self, job_id: str):
    """Process an AI job with minimal parsing in the background (max 10 work items)."""
    db = None
    job_uuid = UUID(job_id)
    
    try:
        # Create database session with error handling
        db = SessionLocal()
        
        # Get the AI job
        ai_job = db.query(AIJob).filter(AIJob.id == job_uuid).first()
        if not ai_job:
            logger.error(f"AI job {job_id} not found")
            return {"status": "failed", "error": "Job not found"}
        
        # Mark as processing
        ai_job.status = JobStatus.PROCESSING
        ai_job.progress = 10
        db.commit()
        
        # Get file record
        file_record = db.query(File).filter(File.id == ai_job.file_id).first()
        if not file_record:
            logger.error(f"File not found for job {job_id}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = "Associated file not found"
            db.commit()
            return {"status": "failed", "error": "File not found"}
        
        logger.info(f"🔥 Processing minimal AI job {job_id} for file: {file_record.file_name}")
        
        # Extract text from file
        logger.info(f"Extracting text from {file_record.storage_path}")
        ai_job.progress = 30
        db.commit()
        
        try:
            text_content = extract_text_from_file(file_record.storage_path)
            if not text_content.strip():
                raise ValueError("No text content extracted from file")
            
        except Exception as e:
            logger.error(f"Text extraction failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Text extraction failed: {str(e)}"
            db.commit()
            return {"status": "failed", "error": str(e)}
        
        # Parse content with AI using minimal approach
        logger.info(f"Processing text with minimal AI for job {job_id}")
        ai_job.progress = 60
        db.commit()
        
        try:
            ai_service = AIParser()
            # Use the new minimal parsing method
            parsed_results = ai_service.parse_requirements_document_minimal(text_content)
            
            if not parsed_results:
                raise ValueError("AI parsing returned no results")
            
            # Log the minimal results
            total_work_items = sum(len(result.get("work_items", [])) for result in parsed_results)
            logger.info(f"🎯 Minimal parsing completed for {file_record.file_name}:")
            logger.info(f"   📄 Generated {len(parsed_results)} result sections")
            logger.info(f"   📊 Total work items: {total_work_items} (minimal approach)")
                
        except Exception as e:
            logger.error(f"AI minimal parsing failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"AI minimal parsing failed: {str(e)}"
            db.commit()
            
            # Try falling back to regular two-pass if minimal fails
            try:
                logger.info(f"Falling back to two-pass approach for job {job_id}")
                parsed_results = ai_service.parse_requirements_document_two_pass(text_content)
                total_work_items = sum(len(result.get("work_items", [])) for result in parsed_results)
                logger.info(f"📊 Fallback two-pass completed: {total_work_items} work items")
            except Exception as fallback_e:
                logger.error(f"Fallback also failed for job {job_id}: {str(fallback_e)}")
                return {"status": "failed", "error": str(e)}
        
        # Create work items in database
        logger.info(f"Creating work items in database for job {job_id}")
        ai_job.progress = 80
        db.commit()
        
        try:
            work_item_service = WorkItemService()
            created_items = work_item_service.create_work_items_with_hierarchy(
                db=db,
                project_id=ai_job.project_id,
                parsed_results=parsed_results,
                file_name=file_record.file_name
            )
            
            logger.info(f"✅ Minimal processing completed for {file_record.file_name}")
            logger.info(f"   📊 Created {len(created_items)} work items in database")
            
        except Exception as e:
            logger.error(f"Work item creation failed for job {job_id}: {str(e)}")
            ai_job.status = JobStatus.FAILED
            ai_job.error_message = f"Work item creation failed: {str(e)}"
            db.commit()
            return {"status": "failed", "error": str(e)}
        
        # Index document for RAG (chatbot functionality)
        logger.info(f"Indexing document for RAG: {file_record.file_name}")
        ai_job.progress = 90
        db.commit()
        
        try:
            from app.services.rag_service import rag_service
            index_success = rag_service.index_document(
                db=db,
                file_id=ai_job.file_id,
                user_id=file_record.uploaded_by
            )
            
            if index_success:
                logger.info(f"✅ Successfully indexed document for RAG: {file_record.file_name}")
            else:
                logger.warning(f"⚠️ Failed to index document for RAG: {file_record.file_name}")
                
        except Exception as e:
            logger.error(f"RAG indexing failed for job {job_id}: {str(e)}")
            # Don't fail the entire job if RAG indexing fails, just log the warning
            logger.warning(f"⚠️ Document processing completed but RAG indexing failed: {str(e)}")
        
        # Mark as completed
        ai_job.status = JobStatus.DONE
        ai_job.progress = 100
        db.commit()
        
        logger.info(f"🎉 Minimal AI job {job_id} completed successfully")
        return {
            "status": "completed", 
            "work_items_created": len(created_items),
            "total_work_items": total_work_items
        }
        
    except Exception as e:
        logger.error(f"Unexpected error in minimal AI job {job_id}: {str(e)}")
        
        # Mark job as failed
        try:
            ai_job = db.query(AIJob).filter(AIJob.id == job_uuid).first()
            if ai_job:
                ai_job.status = JobStatus.FAILED
                ai_job.error_message = f"Unexpected error: {str(e)}"
                db.commit()
        except:
            pass  # Don't fail on cleanup failure
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        if db:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Error closing database session: {close_error}")


@celery_app.task
def cleanup_old_jobs():
    """Clean up old completed/failed jobs."""
    db = None
    try:
        db = SessionLocal()
        # This is a maintenance task to clean up old jobs
        # You can implement retention policies here
        logger.info("Job cleanup task executed")
        
    finally:
        if db:
            try:
                db.close()
            except Exception as close_error:
                logger.error(f"Error closing database session: {close_error}")
