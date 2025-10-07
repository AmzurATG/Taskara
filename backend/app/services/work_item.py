import json
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models.work_item import WorkItem, ItemType, ItemStatus, ItemPriority
from app.schemas.work_item import WorkItemCreate, WorkItemUpdate
from app.utils.hierarchy_manager import organize_work_items_intelligently

# Set up logging for work item service
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


class WorkItemService:
    @staticmethod
    def create_work_item_from_ai(db: Session, work_item_data: Dict[str, Any], project_id: UUID, source_file_id: UUID = None) -> WorkItem:
        """Create a work item from parsed AI data."""
        
        # Normalize work item type (fix any plural forms)
        raw_type = work_item_data.get("type", "task")
        if raw_type == "storys":
            raw_type = "story"
        elif raw_type == "tasks":
            raw_type = "task"
        elif raw_type == "subtasks":
            raw_type = "subtask"
        elif raw_type == "epics":
            raw_type = "epic"
        
        # Convert string enums to enum types
        item_type = ItemType(raw_type)
        priority = ItemPriority(work_item_data.get("priority", "medium"))
        
        # Handle acceptance criteria (convert list to JSON string)
        acceptance_criteria = work_item_data.get("acceptance_criteria", [])
        if isinstance(acceptance_criteria, list):
            acceptance_criteria_json = json.dumps(acceptance_criteria) if acceptance_criteria else None
        else:
            acceptance_criteria_json = str(acceptance_criteria) if acceptance_criteria else None
        
        # Get order_index from organized data (intelligent hierarchy manager sets this)
        order_index = work_item_data.get("order_index", 1)  # Default to 1 instead of 0
        
        db_work_item = WorkItem(
            project_id=project_id,
            item_type=item_type,
            title=work_item_data["title"],
            description=work_item_data.get("description", ""),
            priority=priority,
            acceptance_criteria=acceptance_criteria_json,
            estimated_hours=work_item_data.get("estimated_hours"),
            status=ItemStatus.AI_GENERATED,
            order_index=order_index,
            source_file_id=source_file_id
        )
        
        db.add(db_work_item)
        db.flush()  # Get ID without committing
        return db_work_item
    
    @staticmethod
    def create_work_items_with_hierarchy(
        db: Session, 
        parsed_results: List[Dict[str, Any]], 
        project_id: UUID,
        file_name: str = None,
        source_file_id: UUID = None
    ) -> List[WorkItem]:
        """Create work items with intelligent automatic hierarchy."""
        logger.info(f"🤖 Creating work items with intelligent hierarchy for project {project_id}" + (f" from file: {file_name}" if file_name else ""))
        
        # Collect all work items from all parsed results
        all_work_items = []
        for i, result in enumerate(parsed_results):
            work_items = result.get("work_items", [])
            all_work_items.extend(work_items)
            logger.info(f"   📄 Section {i+1}: Found {len(work_items)} work items")
        
        if not all_work_items:
            logger.warning("⚠️ No work items found in parsed results")
            return []
        
        logger.info(f"📊 Processing {len(all_work_items)} total work items for intelligent organization...")
        
        # Log breakdown by type before organization
        type_counts = {
            'epic': len([item for item in all_work_items if item.get('type') == 'epic']),
            'story': len([item for item in all_work_items if item.get('type') == 'story']),
            'task': len([item for item in all_work_items if item.get('type') == 'task']),
            'subtask': len([item for item in all_work_items if item.get('type') == 'subtask'])
        }
        logger.info(f"📊 Original AI-generated breakdown: {type_counts['epic']} epics, {type_counts['story']} stories, {type_counts['task']} tasks, {type_counts['subtask']} subtasks")
        
        # Step 1: Intelligently organize work items into proper hierarchy
        organized_items, organization_stats = organize_work_items_intelligently(all_work_items, project_id, file_name)
        
        logger.info(f"✨ Organization completed:")
        logger.info(f"   📁 Created {organization_stats['created_epics']} new epics")
        logger.info(f"   🔗 Assigned {organization_stats['assigned_relationships']} parent-child relationships") 
        logger.info(f"   ⚠️ {organization_stats['orphaned_items']} items remain orphaned")
        
        # Log detailed final breakdown
        final_counts = organization_stats['final_counts']
        logger.info(f"📊 Final organized breakdown: {final_counts['epics']} epics, {final_counts['stories']} stories, {final_counts['tasks']} tasks, {final_counts['subtasks']} subtasks")
        
        # Step 2: Create work items in database with proper relationships
        logger.info("💾 Creating work items in database...")
        created_items = []
        title_to_item_map = {}
        
        # First pass: Create all items without parent relationships
        creation_stats = {'epics': 0, 'stories': 0, 'tasks': 0, 'subtasks': 0, 'failed': 0}
        for item_data in organized_items:
            try:
                work_item = WorkItemService.create_work_item_from_ai(db, item_data, project_id, source_file_id)
                created_items.append(work_item)
                title_to_item_map[work_item.title] = work_item
                
                # Track creation stats
                plural_type = {
                    'epic': 'epics',
                    'story': 'stories', 
                    'task': 'tasks',
                    'subtask': 'subtasks'
                }.get(work_item.item_type.value, work_item.item_type.value + 's')
                creation_stats[plural_type] += 1
                
                # Add category information to work item if available
                if '_category' in item_data:
                    # You could store this in a separate field or metadata
                    work_item.description = f"{work_item.description}\n\n[Auto-categorized: {item_data['_category']}]"
                
            except Exception as e:
                creation_stats['failed'] += 1
                logger.error(f"❌ Failed to create work item '{item_data.get('title', 'Unknown')}': {str(e)}")
                continue
        
        logger.info(f"📊 Database creation results: {creation_stats['epics']} epics, {creation_stats['stories']} stories, {creation_stats['tasks']} tasks, {creation_stats['subtasks']} subtasks created")
        if creation_stats['failed'] > 0:
            logger.warning(f"⚠️ {creation_stats['failed']} work items failed to create")
        
        # Second pass: Set parent relationships based on organized hierarchy
        logger.info("🔗 Establishing parent-child relationships in database...")
        relationships_created = 0
        relationships_failed = 0
        for item_data in organized_items:
            item_title = item_data.get("title")
            parent_reference = item_data.get("parent_reference")
            
            if item_title and parent_reference and item_title in title_to_item_map:
                child_item = title_to_item_map[item_title]
                
                # Find parent by title
                parent_item = title_to_item_map.get(parent_reference)
                if parent_item:
                    child_item.parent_id = parent_item.id
                    relationships_created += 1
                    logger.debug(f"🔗 Linked '{child_item.title[:40]}...' to parent '{parent_item.title[:40]}...'")
                else:
                    relationships_failed += 1
                    logger.warning(f"⚠️ Parent '{parent_reference}' not found for '{item_title}'")
        
        logger.info(f"✅ Created {relationships_created} parent-child relationships in database")
        if relationships_failed > 0:
            logger.warning(f"⚠️ {relationships_failed} relationships failed to create")
        
        # Commit all changes
        try:
            db.commit()
            logger.info("💾 Database commit successful")
        except Exception as e:
            logger.error(f"❌ Database commit failed: {str(e)}")
            db.rollback()
            raise
        
        # Refresh all items to get updated data
        for item in created_items:
            db.refresh(item)
        
        # Log final summary
        logger.info(f"🎯 Successfully created {len(created_items)} work items with intelligent hierarchy for {file_name or 'project'}")
        logger.info(f"📈 Summary for {file_name or 'project'}:")
        logger.info(f"   📖 Total Epics: {final_counts['epics']} ({organization_stats['created_epics']} auto-generated)")
        logger.info(f"   📝 Total Stories: {final_counts['stories']}")
        logger.info(f"   ⚡ Total Tasks: {final_counts['tasks']}")
        logger.info(f"   🔧 Total Subtasks: {final_counts['subtasks']}")
        logger.info(f"   🔗 Parent-child relationships: {relationships_created}")
        logger.info(f"   🏷️ Categories used: {', '.join(set(organization_stats.get('categories_used', [])))}")
        
        return created_items
    
    @staticmethod
    def get_project_work_items(
        db: Session, 
        project_id: UUID, 
        user_id: UUID,
        item_type: Optional[ItemType] = None,
        parent_id: Optional[UUID] = None,
        include_inactive: bool = False
    ) -> List[WorkItem]:
        """Get all work items for a project with source file information. By default, only returns active items."""
        from sqlalchemy.orm import joinedload
        
        try:
            query = db.query(WorkItem).options(joinedload(WorkItem.source_file)).filter(WorkItem.project_id == project_id)
            
            # Filter by active status unless explicitly including inactive items
            if not include_inactive:
                query = query.filter(WorkItem.active == True)
            
            if item_type:
                query = query.filter(WorkItem.item_type == item_type)
            
            if parent_id is not None:
                query = query.filter(WorkItem.parent_id == parent_id)
            
            return query.order_by(WorkItem.order_index, WorkItem.created_at).all()
        except Exception as e:
            # If there's an error with joinedload, fall back to basic query with manual loading
            logger.warning(f"Error loading work items with source files: {e}")
            from app.db.models.file import File
            
            query = db.query(WorkItem).filter(WorkItem.project_id == project_id)
            
            # Filter by active status unless explicitly including inactive items
            if not include_inactive:
                query = query.filter(WorkItem.active == True)
            
            if item_type:
                query = query.filter(WorkItem.item_type == item_type)
                
            if parent_id is not None:
                query = query.filter(WorkItem.parent_id == parent_id)
            
            work_items = query.order_by(WorkItem.order_index, WorkItem.created_at).all()
            
            # For each work item, get the associated file name if it exists
            for work_item in work_items:
                if work_item.source_file_id:
                    # Query the file directly using the source_file_id
                    file_record = db.query(File).filter(File.id == work_item.source_file_id).first()
                    if file_record:
                        work_item.source_file_name = file_record.file_name
                    else:
                        work_item.source_file_name = None
                else:
                    work_item.source_file_name = None
            
            return work_items
    
    @staticmethod
    def get_work_item_hierarchy(db: Session, project_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
        """Get work items organized in hierarchy."""
        all_items = WorkItemService.get_project_work_items(db, project_id, user_id)
        
        # Create hierarchy mapping
        items_by_id = {}
        items_by_parent = {}
        
        # First pass: create all item dictionaries
        for item in all_items:
            # Safely get source file name
            source_file_name = None
            try:
                if hasattr(item, 'source_file') and item.source_file and hasattr(item.source_file, 'file_name'):
                    source_file_name = item.source_file.file_name
            except Exception:
                # If there's any issue accessing source file, default to None
                source_file_name = None
            
            item_dict = {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "type": item.item_type.value,
                "priority": item.priority.value,
                "status": item.status.value,
                "active": item.active,
                "acceptance_criteria": json.loads(item.acceptance_criteria) if item.acceptance_criteria else [],
                "estimated_hours": item.estimated_hours,
                "order_index": item.order_index,
                "parent_id": str(item.parent_id) if item.parent_id else None,
                "created_at": item.created_at.isoformat(),
                "children": [],
                "source_file_name": source_file_name
            }
            
            items_by_id[str(item.id)] = item_dict
            
            # Group by parent
            parent_key = str(item.parent_id) if item.parent_id else "root"
            if parent_key not in items_by_parent:
                items_by_parent[parent_key] = []
            items_by_parent[parent_key].append(item_dict)
        
        # Second pass: build hierarchy
        for parent_id, children in items_by_parent.items():
            if parent_id != "root" and parent_id in items_by_id:
                # Sort children by order_index
                children.sort(key=lambda x: (x["order_index"], x["title"]))
                items_by_id[parent_id]["children"] = children
        
        # Return root items (epics) sorted by order_index
        root_items = items_by_parent.get("root", [])
        root_items.sort(key=lambda x: (x["order_index"], x["title"]))
        
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
            Project.owner_id == user_id
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
            status=ItemStatus.IN_REVIEW
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
            Project.owner_id == user_id
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
        """Delete a work item and handle cascade relationships."""
        work_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
        
        if not work_item:
            return False
        
        # Check if this item has children
        children = db.query(WorkItem).filter(WorkItem.parent_id == work_item_id).all()
        
        if children:
            # Update children to have no parent (or you could delete them too)
            for child in children:
                child.parent_id = None
        
        db.delete(work_item)
        db.commit()
        return True
    
    @staticmethod
    def get_children(db: Session, parent_id: UUID) -> List[WorkItem]:
        """Get all children of a work item."""
        return db.query(WorkItem).filter(
            WorkItem.parent_id == parent_id
        ).order_by(WorkItem.order_index, WorkItem.created_at).all()
    
    @staticmethod
    def get_work_item_path(db: Session, work_item_id: UUID) -> List[WorkItem]:
        """Get the path from root to this work item (breadcrumb)."""
        path = []
        current_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
        
        while current_item:
            path.insert(0, current_item)  # Insert at beginning for correct order
            if current_item.parent_id:
                current_item = db.query(WorkItem).filter(WorkItem.id == current_item.parent_id).first()
            else:
                break
        
        return path
    
    @staticmethod
    def move_work_item(
        db: Session, 
        work_item_id: UUID, 
        new_parent_id: Optional[UUID],
        new_order_index: Optional[int] = None
    ) -> Optional[WorkItem]:
        """Move a work item to a different parent and/or order."""
        work_item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
        
        if not work_item:
            return None
        
        # Update parent
        work_item.parent_id = new_parent_id
        
        # Update order index
        if new_order_index is not None:
            work_item.order_index = new_order_index
        else:
            # Auto-assign order index based on siblings
            siblings = db.query(WorkItem).filter(
                WorkItem.parent_id == new_parent_id,
                WorkItem.id != work_item_id
            ).count()
            work_item.order_index = siblings + 1
        
        db.commit()
        db.refresh(work_item)
        return work_item
    
    @staticmethod
    def fix_project_hierarchy(db: Session, project_id: UUID) -> Dict[str, Any]:
        """Fix hierarchy for existing work items in a project."""
        print(f"🔧 Fixing hierarchy for project {project_id}...")
        
        # Get all work items for the project
        work_items = db.query(WorkItem).filter(WorkItem.project_id == project_id).all()
        
        if not work_items:
            return {"message": "No work items found", "fixed_items": 0}
        
        # Convert to dict format for hierarchy manager
        work_items_data = []
        for item in work_items:
            item_data = {
                'title': item.title,
                'description': item.description,
                'type': item.item_type.value,
                'priority': item.priority.value,
                'acceptance_criteria': json.loads(item.acceptance_criteria) if item.acceptance_criteria else [],
                'estimated_hours': item.estimated_hours,
                'parent_reference': None,  # Will be set by hierarchy manager
                'order_index': item.order_index,
                '_existing_id': str(item.id)  # Track existing items
            }
            work_items_data.append(item_data)
        
        # Organize with intelligent hierarchy
        organized_items, stats = organize_work_items_intelligently(work_items_data, project_id)
        
        # Update existing items with new hierarchy
        title_to_item_map = {item.title: item for item in work_items}
        updated_count = 0
        
        for organized_item in organized_items:
            title = organized_item.get('title')
            existing_item = title_to_item_map.get(title)
            
            if existing_item:
                # Update parent relationship
                parent_reference = organized_item.get('parent_reference')
                if parent_reference:
                    parent_item = title_to_item_map.get(parent_reference)
                    if parent_item:
                        existing_item.parent_id = parent_item.id
                        updated_count += 1
                
                # Update order index
                existing_item.order_index = organized_item.get('order_index', 1)
        
        db.commit()
        
        print(f"✅ Fixed hierarchy for {updated_count} work items")
        
        return {
            "message": "Hierarchy fixed successfully",
            "total_items": len(work_items),
            "fixed_items": updated_count,
            "organization_stats": stats
        }

    @staticmethod
    def get_hierarchy_health_check(db: Session, project_id: UUID) -> Dict[str, Any]:
        """Check the health of work item hierarchy for a project."""
        work_items = db.query(WorkItem).filter(WorkItem.project_id == project_id).all()
        
        if not work_items:
            return {"status": "no_items", "score": 0}
        
        total_items = len(work_items)
        epics = [item for item in work_items if item.item_type == ItemType.EPIC]
        stories = [item for item in work_items if item.item_type == ItemType.STORY]
        tasks = [item for item in work_items if item.item_type == ItemType.TASK]
        
        # Check for orphaned items (non-epics without parents)
        orphaned_items = [item for item in work_items 
                         if item.parent_id is None and item.item_type != ItemType.EPIC]
        
        # Check for meaningful order indices
        meaningful_order = not all(item.order_index == 0 for item in work_items)
        
        # Check for empty epics
        empty_epics = []
        for epic in epics:
            has_children = any(item.parent_id == epic.id for item in work_items)
            if not has_children:
                empty_epics.append(epic)
        
        # Calculate health score
        score = 100
        if orphaned_items:
            score -= min(40, len(orphaned_items) * 5)  # Up to 40 points deduction
        if not meaningful_order:
            score -= 30
        if empty_epics:
            score -= min(20, len(empty_epics) * 5)  # Up to 20 points deduction
        
        health_status = "excellent" if score >= 90 else "good" if score >= 70 else "fair" if score >= 50 else "poor"
        
        return {
            "status": health_status,
            "score": max(0, score),
            "total_items": total_items,
            "type_counts": {
                "epics": len(epics),
                "stories": len(stories), 
                "tasks": len(tasks)
            },
            "issues": {
                "orphaned_items": len(orphaned_items),
                "empty_epics": len(empty_epics),
                "meaningless_order": not meaningful_order
            },
            "recommendations": {
                "needs_hierarchy_fix": len(orphaned_items) > 0 or len(empty_epics) > 0,
                "needs_order_fix": not meaningful_order
            }
        }
        """Get statistics organized by hierarchy level."""
        items = db.query(WorkItem).filter(WorkItem.project_id == project_id).all()
        
        stats = {
            "total_items": len(items),
            "by_type": {},
            "by_status": {},
            "by_priority": {},
            "hierarchy_depth": 0,
            "epics": [],
        }
        
        # Basic counts
        for item in items:
            # By type
            type_key = item.item_type.value
            stats["by_type"][type_key] = stats["by_type"].get(type_key, 0) + 1
            
            # By status
            status_key = item.status.value
            stats["by_status"][status_key] = stats["by_status"].get(status_key, 0) + 1
            
            # By priority
            priority_key = item.priority.value
            stats["by_priority"][priority_key] = stats["by_priority"].get(priority_key, 0) + 1
        
        # Epic-level breakdown
        epics = [item for item in items if item.item_type == ItemType.EPIC]
        for epic in epics:
            children = [item for item in items if item.parent_id == epic.id]
            stories = [child for child in children if child.item_type == ItemType.STORY]
            
            epic_stats = {
                "id": str(epic.id),
                "title": epic.title,
                "priority": epic.priority.value,
                "status": epic.status.value,
                "total_children": len(children),
                "stories": len(stories),
                "tasks": 0,
                "subtasks": 0
            }
            
            # Count tasks and subtasks
            for story in stories:
                story_children = [item for item in items if item.parent_id == story.id]
                tasks = [child for child in story_children if child.item_type == ItemType.TASK]
                subtasks = [child for child in story_children if child.item_type == ItemType.SUBTASK]
                
                epic_stats["tasks"] += len(tasks)
                epic_stats["subtasks"] += len(subtasks)
            
            stats["epics"].append(epic_stats)
        
        return stats
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

    @staticmethod
    def get_work_items_by_file(db: Session, file_id: UUID) -> List[WorkItem]:
        """Get all work items generated from a specific file."""
        return db.query(WorkItem).filter(WorkItem.source_file_id == file_id).order_by(WorkItem.order_index).all()
    
    @staticmethod
    def toggle_work_item_active_status(db: Session, work_item_id: UUID, user_id: UUID, active: bool) -> Optional[WorkItem]:
        """Toggle work item active status and cascade to all children."""
        try:
            # Get the work item with permission check
            work_item = WorkItemService.get_work_item_by_id(db, work_item_id, user_id)
            if not work_item:
                return None
            
            # Update work item status
            work_item.active = active
            
            # Cascade to all children recursively
            WorkItemService._cascade_active_status_to_children(db, work_item_id, active)
            
            db.commit()
            db.refresh(work_item)
            return work_item
            
        except Exception as e:
            db.rollback()
            raise e
    
    @staticmethod
    def _cascade_active_status_to_children(db: Session, parent_id: UUID, active: bool):
        """Recursively cascade active status to all children."""
        # Get all direct children
        children = db.query(WorkItem).filter(WorkItem.parent_id == parent_id).all()
        
        for child in children:
            # Update child status
            child.active = active
            
            # Recursively update child's children
            WorkItemService._cascade_active_status_to_children(db, child.id, active)