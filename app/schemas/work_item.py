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
    estimated_hours: Optional[float] = None
    order_index: int = 0


class WorkItemCreate(WorkItemBase):
    project_id: UUID
    parent_id: Optional[UUID] = None


class WorkItemUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    item_type: Optional[ItemType] = None
    priority: Optional[ItemPriority] = None
    status: Optional[ItemStatus] = None
    acceptance_criteria: Optional[str] = None
    estimated_hours: Optional[float] = None
    order_index: Optional[int] = None
    parent_id: Optional[UUID] = None


class WorkItemResponse(WorkItemBase):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    status: ItemStatus
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
    acceptance_criteria: List[str] = []
    estimated_hours: Optional[float] = None
    created_at: str
    children: List['WorkItemHierarchyResponse'] = []


class WorkItemStatsResponse(BaseModel):
    """Statistics about work items in a project."""
    total_items: int
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    total_estimated_hours: float


# Update forward reference
WorkItemHierarchyResponse.model_rebuild()
