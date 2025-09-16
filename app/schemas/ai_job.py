from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class AIJobBase(BaseModel):
    status: JobStatus = JobStatus.QUEUED
    progress: int = Field(default=0, ge=0, le=100)
    error_message: Optional[str] = None


class AIJobCreate(BaseModel):
    project_id: UUID
    file_id: UUID


class AIJobUpdate(BaseModel):
    status: Optional[JobStatus] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    error_message: Optional[str] = None


class AIJobResponse(AIJobBase):
    id: UUID
    project_id: UUID
    file_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIJob(AIJobResponse):
    pass


class AIJobInDB(AIJobResponse):
    pass
