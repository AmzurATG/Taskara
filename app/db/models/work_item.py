import uuid
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Integer, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum

class ItemType(enum.Enum):
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    SUBTASK = "subtask"

class ItemPriority(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ItemStatus(enum.Enum):
    AI_GENERATED = "ai_generated"
    IN_REVIEW = "in_review"
    REVIEWED = "reviewed"
    APPROVED = "approved"

class WorkItem(Base):
    __tablename__ = "work_items"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("work_items.id"), nullable=True)  # self-referential
    item_type = Column(Enum(ItemType), nullable=False)
    title = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(Enum(ItemStatus), default=ItemStatus.AI_GENERATED, nullable=False)
    priority = Column(Enum(ItemPriority), default=ItemPriority.MEDIUM, nullable=False)
    acceptance_criteria = Column(Text, nullable=True)  # JSON string of criteria list
    estimated_hours = Column(Integer, nullable=True)
    order_index = Column(Integer, nullable=False, default=0)  # for sorting
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="work_items")
    parent = relationship("WorkItem", remote_side=[id], back_populates="children")
    children = relationship("WorkItem", back_populates="parent")
