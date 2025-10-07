from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from app.db.models.work_item import ItemType, ItemStatus, ItemPriority


class WorkItemBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    item_type: ItemType
    priority: ItemPriority = ItemPriority.MEDIUM
    acceptance_criteria: Optional[str] = None
    estimated_hours: Optional[int] = None  # Changed to int to match database model
    order_index: int = 0
    active: Optional[bool] = Field(True, description="Whether the work item is active")
    source_file_id: Optional[UUID] = None


class WorkItemCreate(WorkItemBase):
    project_id: UUID
    parent_id: Optional[UUID] = None
    source_file_id: Optional[UUID] = None


class WorkItemUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    item_type: Optional[ItemType] = None
    priority: Optional[ItemPriority] = None
    status: Optional[ItemStatus] = None
    acceptance_criteria: Optional[str] = None
    estimated_hours: Optional[int] = None  # Changed to int to match database model
    order_index: Optional[int] = None
    active: Optional[bool] = Field(None, description="Whether the work item is active")
    parent_id: Optional[UUID] = None
    source_file_id: Optional[UUID] = None


class WorkItemResponse(WorkItemBase):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    source_file_id: Optional[UUID] = None
    source_file_name: Optional[str] = None  # Include file name for display
    status: ItemStatus
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkItemHierarchyResponse(BaseModel):
    """Work item with children for hierarchy display."""
    id: str
    title: str
    description: Optional[str] = None
    type: str
    priority: str
    status: str
    source_file_name: Optional[str] = None
    acceptance_criteria: List[str] = []
    estimated_hours: Optional[float] = None
    created_at: str
    children: List['WorkItemHierarchyResponse'] = []


class EpicWithStatsResponse(BaseModel):
    """Epic with user stories count for project view."""
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    estimated_hours: Optional[float] = None
    created_at: str
    user_stories_count: int = 0


class StoryWithStatsResponse(BaseModel):
    """User story with tasks count."""
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    estimated_hours: Optional[float] = None
    created_at: str
    tasks_count: int = 0


class TaskWithStatsResponse(BaseModel):
    """Task with subtasks count."""
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    estimated_hours: Optional[float] = None
    created_at: str
    subtasks_count: int = 0


class WorkItemStatsResponse(BaseModel):
    """Statistics about work items in a project."""
    total_items: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    total_estimated_hours: float


# Update forward reference
WorkItemHierarchyResponse.model_rebuild()
