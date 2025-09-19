import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(Text, nullable=False)
    email = Column(Text, unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=True)  # nullable if Google login only
    google_id = Column(Text, nullable=True)  # for Google auth
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    projects = relationship("Project", back_populates="owner")
