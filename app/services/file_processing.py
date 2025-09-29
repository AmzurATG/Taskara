import os
import uuid
import hashlib
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
    def _calculate_file_hash(content: bytes) -> str:
        """Calculate SHA-256 hash of file content"""
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def _check_duplicate_file(db: Session, project_id: UUID, file_hash: str, file_name: str) -> Optional[File]:
        """Check if file with same hash or name already exists in project"""
        # Check for exact hash match (same content)
        existing_file = db.query(File).filter(
            File.project_id == project_id,
            File.file_hash == file_hash
        ).first()
        
        if existing_file:
            return existing_file
            
        # Check for same filename (different content but same name)
        existing_file_by_name = db.query(File).filter(
            File.project_id == project_id,
            File.file_name == file_name
        ).first()
        
        return existing_file_by_name
    
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
        
        # Determine content type
        content_type_map = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword'
        }
        content_type = content_type_map.get(file_extension, 'application/octet-stream')
        
        # Read file content
        try:
            content = await file.read()
            file_size = len(content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to read file: {str(e)}"
            )
        
        # Calculate file hash for duplicate detection
        file_hash = FileService._calculate_file_hash(content)
        
        # Check for duplicates
        existing_file = FileService._check_duplicate_file(db, project_id, file_hash, file.filename)
        if existing_file:
            if existing_file.file_hash == file_hash:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"This file has already been uploaded to your project. The system detected identical content from '{existing_file.file_name}'. Please select a different document to continue."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A file named '{file.filename}' already exists in this project. Please rename your file or choose a different document to avoid conflicts."
                )
        
        # Upload to storage (Supabase or local)
        if FileService._should_use_supabase():
            try:
                # Upload to Supabase Storage
                storage_path = supabase_storage.upload_file(unique_filename, content, content_type)
                print(f"File uploaded to Supabase: {storage_path}")
            except Exception as e:
                print(f"Supabase upload failed, falling back to local storage: {e}")
                # Fallback to local storage if Supabase fails
                FileService._create_upload_directory()
                local_path = os.path.join("uploads", unique_filename)
                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                
                try:
                    with open(local_path, "wb") as buffer:
                        buffer.write(content)
                    storage_path = local_path
                    print(f"File saved locally: {storage_path}")
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
            uploaded_by=user_id,
            file_hash=file_hash,
            file_size=str(file_size)
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
            file_hash=db_file.file_hash,
            file_size=int(file_size) if file_size else None,
            created_at=db_file.created_at,
            message=f"File uploaded successfully. AI job created with ID: {ai_job.id}"
        )
    
    @staticmethod
    def get_project_files(db: Session, project_id: UUID, user_id: UUID) -> List[File]:
        """Get all files for a project"""
        # Verify project ownership
        FileService._verify_project_ownership(db, project_id, user_id)
        
        return db.query(File).filter(File.project_id == project_id).order_by(File.created_at.desc()).all()
    
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
            # Delete the physical file from storage
            if file.storage_path:
                if file.storage_path.startswith('http'):
                    # It's a Supabase URL, extract the file path and delete from Supabase
                    if supabase_storage.is_available():
                        # Extract file path from URL (assuming URL format: .../{bucket_name}/{file_path})
                        try:
                            # Get the path part after the bucket name
                            url_parts = file.storage_path.split('/')
                            if 'requirement-files' in url_parts:
                                bucket_index = url_parts.index('requirement-files')
                                file_path = '/'.join(url_parts[bucket_index + 1:])
                                supabase_storage.delete_file(file_path)
                                print(f"Deleted file from Supabase: {file_path}")
                        except Exception as e:
                            print(f"Failed to delete from Supabase: {e}")
                elif os.path.exists(file.storage_path):
                    # It's a local file path
                    os.remove(file.storage_path)
                    print(f"Deleted local file: {file.storage_path}")
            
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
