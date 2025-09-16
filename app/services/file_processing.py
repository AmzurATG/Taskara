import os
import uuid
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from pathlib import Path

from app.db.models.file import File
from app.db.models.project import Project
from app.schemas.file import FileCreate, FileUploadResponse
from app.services.ai_job import AIJobService
from app.schemas.ai_job import AIJobCreate
from app.core.supabase import supabase_storage


class FileService:
    # Allowed file extensions
    ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
    
    @staticmethod
    def _should_use_supabase() -> bool:
        """Check if Supabase should be used for storage."""
        return supabase_storage.is_available()
    
    @staticmethod
    def _create_upload_directory():
        """Create upload directory if it doesn't exist"""
        Path("uploads").mkdir(exist_ok=True)
    
    @staticmethod
    def _create_upload_directory():
        """Create upload directory if it doesn't exist"""
        Path("uploads").mkdir(exist_ok=True)
    
    @staticmethod
    def _validate_file(file: UploadFile) -> None:
        """Validate uploaded file"""
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in FileService.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_extension} not allowed. Allowed types: {', '.join(FileService.ALLOWED_EXTENSIONS)}"
            )
        
        # Check file size (10MB limit)
        if hasattr(file, 'size') and file.size > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size exceeds 10MB limit"
            )
    
    @staticmethod
    def _verify_project_ownership(db: Session, project_id: UUID, user_id: UUID) -> Project:
        """Verify that the project belongs to the user"""
        project = db.query(Project).filter(
            Project.id == project_id,
            Project.owner_id == user_id
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or access denied"
            )
        
        return project
    
    @staticmethod
    async def upload_file(
        db: Session, 
        project_id: UUID, 
        file: UploadFile, 
        user_id: UUID
    ) -> FileUploadResponse:
        """Upload file and save metadata"""
        
        # Validate file
        FileService._validate_file(file)
        
        # Verify project ownership
        project = FileService._verify_project_ownership(db, project_id, user_id)
        
        # Generate unique filename with project prefix
        file_extension = Path(file.filename).suffix.lower()
        unique_filename = f"project_{project_id}/{uuid.uuid4()}{file_extension}"
        
        # Read file content
        try:
            content = await file.read()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read file: {str(e)}"
            )
        
        # Upload to storage (Supabase or local)
        if FileService._should_use_supabase():
            try:
                # Upload to Supabase
                storage_path = supabase_storage.upload_file(unique_filename, content)
            except Exception as e:
                # Fallback to local storage if Supabase fails
                print(f"Supabase upload failed, falling back to local storage: {e}")
                FileService._create_upload_directory()
                local_path = os.path.join("uploads", unique_filename)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                try:
                    with open(local_path, "wb") as buffer:
                        buffer.write(content)
                    storage_path = local_path
                except Exception as local_e:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to save file: {str(local_e)}"
                    )
        else:
            # Use local storage
            FileService._create_upload_directory()
            local_path = os.path.join("uploads", unique_filename)
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            try:
                with open(local_path, "wb") as buffer:
                    buffer.write(content)
                storage_path = local_path
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to save file locally: {str(e)}"
                )
        
        # Save metadata to database
        db_file = File(
            project_id=project_id,
            file_name=file.filename,
            storage_path=storage_path,
            uploaded_by=user_id
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        
        # Create AI job for processing
        ai_job = AIJobService.create_ai_job(
            db=db,
            job_data=AIJobCreate(
                project_id=project_id,
                file_id=db_file.id
            )
        )
        
        return FileUploadResponse(
            id=db_file.id,
            project_id=db_file.project_id,
            file_name=db_file.file_name,
            storage_path=db_file.storage_path,
            uploaded_by=db_file.uploaded_by,
            created_at=db_file.created_at,
            message=f"File uploaded successfully. AI job created with ID: {ai_job.id}"
        )
    
    @staticmethod
    def get_project_files(db: Session, project_id: UUID, user_id: UUID) -> List[File]:
        """Get all files for a project"""
        # Verify project ownership
        FileService._verify_project_ownership(db, project_id, user_id)
        
        return db.query(File).filter(File.project_id == project_id).all()
    
    @staticmethod
    def get_file(db: Session, file_id: UUID, user_id: UUID) -> Optional[File]:
        """Get a specific file by ID with ownership validation"""
        file = db.query(File).filter(File.id == file_id).first()
        
        if not file:
            return None
        
        # Verify project ownership through the file's project
        FileService._verify_project_ownership(db, file.project_id, user_id)
        
        return file
    
    @staticmethod
    def delete_file(db: Session, file_id: UUID, user_id: UUID) -> bool:
        """Delete a file and its associated AI jobs."""
        file = FileService.get_file(db, file_id, user_id)
        
        if not file:
            return False
        
        try:
            # Delete the physical file
            if file.storage_path and os.path.exists(file.storage_path):
                os.remove(file.storage_path)
            
            # Delete associated AI jobs (they should cascade due to foreign key constraints)
            from app.db.models.ai_job import AIJob
            ai_jobs = db.query(AIJob).filter(AIJob.file_id == file_id).all()
            for job in ai_jobs:
                db.delete(job)
            
            # Delete the file record
            db.delete(file)
            db.commit()
            
            return True
            
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file: {str(e)}"
            )
