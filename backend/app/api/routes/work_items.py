from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.models.file import File
from app.db.models.ai_job import AIJob, JobStatus
from app.db.models.work_item import WorkItem, ItemType, ItemStatus
from app.db.models.project import Project
from app.schemas.work_item import (
    WorkItemResponse, 
    WorkItemCreate,
    WorkItemUpdate, 
    WorkItemHierarchyResponse,
    WorkItemStatsResponse
)
from app.services.work_item import WorkItemService

router = APIRouter()


@router.get("/projects/{project_id}/work-items", response_model=List[WorkItemResponse])
async def get_project_work_items(
    project_id: UUID,
    item_type: Optional[ItemType] = Query(None, description="Filter by item type"),
    parent_id: Optional[UUID] = Query(None, description="Filter by parent ID"),
    include_inactive: bool = Query(False, description="Include inactive work items"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all work items for a project."""
    try:
        work_items = WorkItemService.get_project_work_items(
            db, project_id, current_user.id, item_type, parent_id, include_inactive
        )
        
        # Convert to response model with source file information
        response_items = []
        for item in work_items:
            response_item = WorkItemResponse.from_orm(item)
            # Add source file name if available
            if hasattr(item, 'source_file') and item.source_file:
                response_item.source_file_name = item.source_file.file_name
            elif hasattr(item, 'source_file_name'):
                response_item.source_file_name = item.source_file_name
            response_items.append(response_item)
        return response_items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve work items: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/inactive", response_model=List[WorkItemResponse])
async def get_inactive_work_items(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all inactive work items for a project."""
    try:
        work_items = WorkItemService.get_project_work_items(
            db, project_id, current_user.id, include_inactive=True
        )
        
        # Filter only inactive items
        inactive_items = [item for item in work_items if not item.active]
        
        # Convert to response model with source file information
        response_items = []
        for item in inactive_items:
            response_item = WorkItemResponse.from_orm(item)
            # Add source file name if available
            if hasattr(item, 'source_file') and item.source_file:
                response_item.source_file_name = item.source_file.file_name
            elif hasattr(item, 'source_file_name'):
                response_item.source_file_name = item.source_file_name
            response_items.append(response_item)
        return response_items
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve inactive work items: {str(e)}"
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
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update work item status."""
    try:
        # Extract status from request body
        new_status = ItemStatus(status_update.get("status"))
        
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


@router.get("/work-items/{work_item_id}/children", response_model=List[WorkItemResponse])
async def get_work_item_children(
    work_item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all children of a work item."""
    try:
        children = WorkItemService.get_children(db, work_item_id)
        return [WorkItemResponse.from_orm(child) for child in children]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve children: {str(e)}"
        )


@router.get("/work-items/{work_item_id}/path", response_model=List[WorkItemResponse])
async def get_work_item_path(
    work_item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the path from root to this work item (breadcrumb)."""
    try:
        path = WorkItemService.get_work_item_path(db, work_item_id)
        return [WorkItemResponse.from_orm(item) for item in path]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve path: {str(e)}"
        )


@router.put("/work-items/{work_item_id}/move")
async def move_work_item(
    work_item_id: UUID,
    new_parent_id: Optional[UUID] = None,
    new_order_index: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Move a work item to a different parent and/or order."""
    try:
        work_item = WorkItemService.move_work_item(
            db, work_item_id, new_parent_id, new_order_index
        )
        
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
            detail=f"Failed to move work item: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/stats/hierarchy")
async def get_work_item_stats_hierarchy(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work item statistics organized by hierarchy."""
    try:
        stats = WorkItemService.get_work_item_stats_by_hierarchy(db, project_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stats: {str(e)}"
        )


@router.post("/projects/{project_id}/work-items/fix-hierarchy")
async def fix_project_hierarchy(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Automatically fix hierarchy for existing work items in a project."""
    try:
        result = WorkItemService.fix_project_hierarchy(db, project_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fix hierarchy: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/hierarchy-health")
async def get_hierarchy_health_check(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check the health of work item hierarchy for a project."""
    try:
        health = WorkItemService.get_hierarchy_health_check(db, project_id)
        return health
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check hierarchy health: {str(e)}"
        )


@router.get("/projects/{project_id}/work-items/generation-stats")
async def get_work_item_generation_stats(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work item generation statistics by file for a project."""
    try:
        # Get all files for the project with their AI jobs
        files_with_jobs = db.query(File).join(AIJob).filter(
            File.project_id == project_id,
            AIJob.status == JobStatus.DONE
        ).all()
        
        if not files_with_jobs:
            return {
                "project_id": str(project_id),
                "total_files_processed": 0,
                "file_statistics": [],
                "overall_totals": {
                    "epics": 0,
                    "stories": 0,
                    "tasks": 0,
                    "subtasks": 0,
                    "total_work_items": 0
                }
            }
        
        file_stats = []
        overall_totals = {"epics": 0, "stories": 0, "tasks": 0, "subtasks": 0}
        
        for file in files_with_jobs:
            # Get the latest successful AI job for this file
            latest_job = db.query(AIJob).filter(
                AIJob.file_id == file.id,
                AIJob.status == JobStatus.DONE
            ).order_by(AIJob.created_at.desc()).first()
            
            if latest_job:
                # Parse completion message to extract work item counts
                error_message = latest_job.error_message or ""
                
                # Extract breakdown from completion message
                epics = stories = tasks = subtasks = 0
                if "epics" in error_message:
                    try:
                        import re
                        # Parse the completion message format
                        epic_match = re.search(r'(\d+) epics', error_message)
                        story_match = re.search(r'(\d+) stories', error_message)
                        task_match = re.search(r'(\d+) tasks', error_message)
                        subtask_match = re.search(r'(\d+) subtasks', error_message)
                        
                        if epic_match: epics = int(epic_match.group(1))
                        if story_match: stories = int(story_match.group(1))
                        if task_match: tasks = int(task_match.group(1))
                        if subtask_match: subtasks = int(subtask_match.group(1))
                    except:
                        # Fallback: count actual work items created after this job
                        work_items = db.query(WorkItem).filter(
                            WorkItem.project_id == project_id,
                            WorkItem.created_at >= latest_job.created_at
                        ).all()
                        
                        epics = len([w for w in work_items if w.item_type == ItemType.EPIC])
                        stories = len([w for w in work_items if w.item_type == ItemType.STORY])
                        tasks = len([w for w in work_items if w.item_type == ItemType.TASK])
                        subtasks = len([w for w in work_items if w.item_type == ItemType.SUBTASK])
                
                file_stat = {
                    "file_id": str(file.id),
                    "file_name": file.file_name,
                    "processed_at": latest_job.created_at.isoformat(),
                    "work_items_created": {
                        "epics": epics,
                        "stories": stories,
                        "tasks": tasks,
                        "subtasks": subtasks,
                        "total": epics + stories + tasks + subtasks
                    },
                    "job_id": str(latest_job.id)
                }
                
                file_stats.append(file_stat)
                
                # Update overall totals
                overall_totals["epics"] += epics
                overall_totals["stories"] += stories
                overall_totals["tasks"] += tasks
                overall_totals["subtasks"] += subtasks
        
        overall_totals["total_work_items"] = sum(overall_totals.values())
        
        return {
            "project_id": str(project_id),
            "total_files_processed": len(file_stats),
            "file_statistics": file_stats,
            "overall_totals": overall_totals
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve generation stats: {str(e)}"
        )


@router.get("/projects/{project_id}/files/{file_id}/work-items/stats")
async def get_file_work_item_stats(
    project_id: UUID,
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get detailed work item generation statistics for a specific file."""
    try:
        # Get the file
        file = db.query(File).filter(
            File.id == file_id,
            File.project_id == project_id
        ).first()
        
        if not file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Get the latest successful AI job for this file
        latest_job = db.query(AIJob).filter(
            AIJob.file_id == file.id,
            AIJob.status == JobStatus.DONE
        ).order_by(AIJob.created_at.desc()).first()
        
        if not latest_job:
            return {
                "file_id": str(file.id),
                "file_name": file.file_name,
                "status": "no_successful_processing",
                "work_items_created": {
                    "epics": 0,
                    "stories": 0,
                    "tasks": 0,
                    "subtasks": 0,
                    "total": 0
                }
            }
        
        # Get work items created after this job
        work_items = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.created_at >= latest_job.created_at
        ).all()
        
        # Count by type
        type_counts = {
            "epics": len([w for w in work_items if w.item_type == ItemType.EPIC]),
            "stories": len([w for w in work_items if w.item_type == ItemType.STORY]),
            "tasks": len([w for w in work_items if w.item_type == ItemType.TASK]),
            "subtasks": len([w for w in work_items if w.item_type == ItemType.SUBTASK])
        }
        type_counts["total"] = sum(type_counts.values())
        
        # Get hierarchy relationships
        hierarchy_info = {
            "orphaned_items": len([w for w in work_items if w.parent_id is None and w.item_type != ItemType.EPIC]),
            "total_relationships": len([w for w in work_items if w.parent_id is not None])
        }
        
        return {
            "file_id": str(file.id),
            "file_name": file.file_name,
            "processed_at": latest_job.created_at.isoformat(),
            "job_id": str(latest_job.id),
            "work_items_created": type_counts,
            "hierarchy_info": hierarchy_info,
            "completion_message": latest_job.error_message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve file stats: {str(e)}"
        )


@router.patch("/work-items/{work_item_id}/toggle-active")
def toggle_work_item_active_status(
    work_item_id: UUID,
    active_status: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Toggle work item active status and cascade to all children."""
    try:
        active = active_status.get("active")
        if active is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="'active' field is required"
            )
        
        # Get the work item with permission check (simplified)
        work_item = db.query(WorkItem).join(Project).filter(
            WorkItem.id == work_item_id,
            Project.owner_id == current_user.id
        ).first()
        
        if not work_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Work item not found"
            )
        
        # Update work item status
        work_item.active = active
        
        # Simple cascade - get all children at once and update
        # This is a simplified version without deep recursion
        children = db.query(WorkItem).filter(WorkItem.parent_id == work_item_id).all()
        for child in children:
            child.active = active
            
            # Get grandchildren and update them too
            grandchildren = db.query(WorkItem).filter(WorkItem.parent_id == child.id).all()
            for grandchild in grandchildren:
                grandchild.active = active
        
        db.commit()
        db.refresh(work_item)
        
        # Return simple success response instead of complex schema
        return {
            "success": True,
            "message": f"Work item {'activated' if active else 'deactivated'} successfully",
            "work_item_id": str(work_item_id),
            "active": active
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle work item active status: {str(e)}"
        )
