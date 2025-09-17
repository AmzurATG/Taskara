from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class ProjectInDBBase(ProjectBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Project(ProjectInDBBase):
    pass


class ProjectInDB(ProjectInDBBase):
    pass


class ProjectViewDetails(BaseModel):
    """Project details with hierarchical work items for viewing."""
    id: UUID
    name: str
    description: Optional[str] = None
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    epics: List[Dict[str, Any]] = []
    work_items_summary: Dict[str, Any] = {}

    class Config:
        from_attributes = True
