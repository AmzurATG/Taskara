import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class File(Base):
    __tablename__ = "files"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    file_name = Column(Text, nullable=False)
    storage_path = Column(Text, nullable=False)  # path/S3 URL/cloudinary / supabase
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_hash = Column(String(64), nullable=True)  # SHA-256 hash for duplicate detection
    file_size = Column(String, nullable=True)  # File size in bytes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="files")
    uploader = relationship("User")
    ai_jobs = relationship("AIJob", back_populates="file")
