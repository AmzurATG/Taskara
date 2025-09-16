import json
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.work_item import WorkItem, ItemType, ItemStatus, ItemPriority
from app.schemas.work_item import WorkItemCreate, WorkItemUpdate


class WorkItemService:
    @staticmethod
    def create_work_item_from_ai(db: Session, work_item_data: Dict[str, Any], project_id: UUID) -> WorkItem:
        """Create a work item from parsed AI data."""
        
        # Convert string enums to enum types
        item_type = ItemType(work_item_data.get("type", "task"))
        priority = ItemPriority(work_item_data.get("priority", "medium"))
        
        # Handle acceptance criteria (convert list to JSON string)
        acceptance_criteria = work_item_data.get("acceptance_criteria", [])
        if isinstance(acceptance_criteria, list):
            acceptance_criteria_json = json.dumps(acceptance_criteria) if acceptance_criteria else None
        else:
            acceptance_criteria_json = str(acceptance_criteria) if acceptance_criteria else None
        
        db_work_item = WorkItem(
            project_id=project_id,
            item_type=item_type,
            title=work_item_data["title"],
            description=work_item_data.get("description", ""),
            priority=priority,
            acceptance_criteria=acceptance_criteria_json,
            estimated_hours=work_item_data.get("estimated_hours"),
            status=ItemStatus.AI_GENERATED,
            order_index=work_item_data.get("order_index", 0)
        )
        
        db.add(db_work_item)
        db.flush()  # Get ID without committing
        return db_work_item
    
    @staticmethod
    def create_work_items_with_hierarchy(
        db: Session, 
        parsed_results: List[Dict[str, Any]], 
        project_id: UUID
    ) -> List[WorkItem]:
        """Create work items with proper parent-child relationships."""
        created_items = []
        title_to_item_map = {}
        
        # First pass: Create all items without parent relationships
        for result in parsed_results:
            work_items = result.get("work_items", [])
            
            for item_data in work_items:
                work_item = WorkItemService.create_work_item_from_ai(db, item_data, project_id)
                created_items.append(work_item)
                title_to_item_map[work_item.title] = work_item
        
        # Second pass: Set parent relationships
        for result in parsed_results:
            work_items = result.get("work_items", [])
            
            for item_data in work_items:
                parent_reference = item_data.get("parent_reference")
                if parent_reference and parent_reference in title_to_item_map:
                    child_item = title_to_item_map[item_data["title"]]
                    parent_item = title_to_item_map[parent_reference]
                    child_item.parent_id = parent_item.id
        
        db.commit()
        
        # Refresh all items
        for item in created_items:
            db.refresh(item)
        
        return created_items
    
    @staticmethod
    def get_project_work_items(
        db: Session, 
        project_id: UUID, 
        user_id: UUID,
        item_type: Optional[ItemType] = None
    ) -> List[WorkItem]:
        """Get all work items for a project."""
        query = db.query(WorkItem).filter(WorkItem.project_id == project_id)
        
        if item_type:
            query = query.filter(WorkItem.item_type == item_type)
        
        return query.order_by(WorkItem.order_index, WorkItem.created_at).all()
    
    @staticmethod
    def get_work_item_hierarchy(db: Session, project_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
        """Get work items organized in hierarchy."""
        all_items = WorkItemService.get_project_work_items(db, project_id, user_id)
        
        # Create hierarchy
        items_by_id = {item.id: item for item in all_items}
        root_items = []
        
        for item in all_items:
            item_dict = {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "type": item.item_type.value,
                "priority": item.priority.value,
                "status": item.status.value,
                "acceptance_criteria": json.loads(item.acceptance_criteria) if item.acceptance_criteria else [],
                "estimated_hours": item.estimated_hours,
                "created_at": item.created_at.isoformat(),
                "children": []
            }
            
            if item.parent_id is None:
                root_items.append(item_dict)
            else:
                # This is a simplified version - you might want to build a proper tree
                pass
        
        return root_items
    
    @staticmethod
    def update_work_item_status(
        db: Session, 
        work_item_id: UUID, 
        new_status: ItemStatus,
        user_id: UUID
    ) -> Optional[WorkItem]:
        """Update work item status."""
        work_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
        
        if not work_item:
            return None
        
        work_item.status = new_status
        db.commit()
        db.refresh(work_item)
        
        return work_item
    
    @staticmethod
    def get_work_item_stats(db: Session, project_id: UUID) -> Dict[str, Any]:
        """Get statistics for work items in a project."""
        items = db.query(WorkItem).filter(WorkItem.project_id == project_id).all()
        
        stats = {
            "total_items": len(items),
            "by_type": {},
            "by_status": {},
            "by_priority": {},
            "total_estimated_hours": 0
        }
        
        for item in items:
            # Count by type
            item_type = item.item_type.value
            stats["by_type"][item_type] = stats["by_type"].get(item_type, 0) + 1
            
            # Count by status
            status = item.status.value
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
            
            # Count by priority
            priority = item.priority.value
            stats["by_priority"][priority] = stats["by_priority"].get(priority, 0) + 1
            
            # Sum estimated hours
            if item.estimated_hours:
                stats["total_estimated_hours"] += item.estimated_hours
        
        return stats
    
    @staticmethod
    def create_work_item(
        db: Session, 
        work_item_create: WorkItemCreate, 
        user_id: UUID
    ) -> WorkItem:
        """Create a new work item from API request."""
        # Validate project exists and user has access
        from app.db.models.project import Project
        project = db.query(Project).filter(
            Project.id == work_item_create.project_id,
            Project.user_id == user_id
        ).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Create work item
        db_work_item = WorkItem(
            project_id=work_item_create.project_id,
            parent_id=work_item_create.parent_id,
            item_type=work_item_create.item_type,
            title=work_item_create.title,
            description=work_item_create.description,
            priority=work_item_create.priority,
            acceptance_criteria=work_item_create.acceptance_criteria,
            estimated_hours=work_item_create.estimated_hours,
            order_index=work_item_create.order_index,
            status=ItemStatus.TODO
        )
        
        db.add(db_work_item)
        db.commit()
        db.refresh(db_work_item)
        return db_work_item
    
    @staticmethod
    def get_work_item_by_id(
        db: Session, 
        work_item_id: UUID, 
        user_id: UUID
    ) -> Optional[WorkItem]:
        """Get a work item by ID, ensuring user has access."""
        from app.db.models.project import Project
        
        work_item = db.query(WorkItem).join(Project).filter(
            WorkItem.id == work_item_id,
            Project.user_id == user_id
        ).first()
        
        return work_item
    
    @staticmethod
    def update_work_item(
        db: Session,
        work_item_id: UUID,
        work_item_update: WorkItemUpdate,
        user_id: UUID
    ) -> Optional[WorkItem]:
        """Update a work item."""
        # Get work item with permission check
        work_item = WorkItemService.get_work_item_by_id(db, work_item_id, user_id)
        
        if not work_item:
            return None
        
        # Update fields
        update_data = work_item_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(work_item, field, value)
        
        db.commit()
        db.refresh(work_item)
        return work_item
    
    @staticmethod
    def delete_work_item(
        db: Session,
        work_item_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete a work item and its children."""
        # Get work item with permission check
        work_item = WorkItemService.get_work_item_by_id(db, work_item_id, user_id)
        
        if not work_item:
            return False
        
        # Delete children first (cascade)
        children = db.query(WorkItem).filter(WorkItem.parent_id == work_item_id).all()
        for child in children:
            db.delete(child)
        
        # Delete the work item
        db.delete(work_item)
        db.commit()
        return True