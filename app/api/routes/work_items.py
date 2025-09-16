from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.user import User
from app.schemas.work_item import (
    WorkItemResponse, 
    WorkItemCreate,
    WorkItemUpdate, 
    WorkItemHierarchyResponse,
    WorkItemStatsResponse
)
from app.services.work_item import WorkItemService
from app.db.models.work_item import ItemType, ItemStatus

router = APIRouter()


@router.get("/projects/{project_id}/work-items", response_model=List[WorkItemResponse])
async def get_project_work_items(
    project_id: UUID,
    item_type: Optional[ItemType] = Query(None, description="Filter by item type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all work items for a project."""
    try:
        work_items = WorkItemService.get_project_work_items(
            db, project_id, current_user.id, item_type
        )
        return [WorkItemResponse.from_orm(item) for item in work_items]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work items: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/hierarchy", response_model=List[WorkItemHierarchyResponse])
async def get_work_items_hierarchy(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work items organized in hierarchy."""
    try:
        hierarchy = WorkItemService.get_work_item_hierarchy(db, project_id, current_user.id)
        return hierarchy
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work item hierarchy: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/stats", response_model=WorkItemStatsResponse)
async def get_work_item_stats(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work item statistics for a project."""
    try:
        stats = WorkItemService.get_work_item_stats(db, project_id)
        return WorkItemStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work item stats: {str(e)}"
        )


@router.patch("/work-items/{work_item_id}/status")
async def update_work_item_status(
    work_item_id: UUID,
    new_status: ItemStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update work item status."""
    try:
        updated_item = WorkItemService.update_work_item_status(
            db, work_item_id, new_status, current_user.id
        )
        
        if not updated_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return {"message": "Work item status updated successfully", "status": new_status.value}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update work item status: {str(e)}"
        )


@router.post("/projects/{project_id}/work-items", response_model=WorkItemResponse)
async def create_work_item(
    project_id: UUID,
    work_item: WorkItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new work item."""
    try:
        # Ensure the project_id matches
        work_item.project_id = project_id
        
        created_item = WorkItemService.create_work_item(db, work_item, current_user.id)
        return WorkItemResponse.from_orm(created_item)
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create work item: {str(e)}"
        )


@router.get("/work-items/{work_item_id}", response_model=WorkItemResponse)
async def get_work_item(
    work_item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a single work item by ID."""
    try:
        work_item = WorkItemService.get_work_item_by_id(db, work_item_id, current_user.id)
        
        if not work_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return WorkItemResponse.from_orm(work_item)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work item: {str(e)}"
        )


@router.put("/work-items/{work_item_id}", response_model=WorkItemResponse)
async def update_work_item(
    work_item_id: UUID,
    work_item_update: WorkItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a work item."""
    try:
        updated_item = WorkItemService.update_work_item(
            db, work_item_id, work_item_update, current_user.id
        )
        
        if not updated_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return WorkItemResponse.from_orm(updated_item)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update work item: {str(e)}"
        )


@router.delete("/work-items/{work_item_id}")
async def delete_work_item(
    work_item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a work item."""
    try:
        success = WorkItemService.delete_work_item(db, work_item_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        return {"message": "Work item deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete work item: {str(e)}"
        )
