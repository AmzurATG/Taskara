from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.db.models.project import Project
from app.db.models.work_item import WorkItem
from app.schemas.user import UserListItem, UserRoleUpdate, UserResponse
from app.schemas.project import Project as ProjectSchema
from app.api.deps import get_current_user

router = APIRouter()

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to ensure current user is admin"""
    if current_user.role != "admin":  # Compare with string instead of enum
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/users", response_model=List[UserListItem])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get list of all users (Admin only)"""
    try:
        query = db.query(User)
        
        # Add search filter if provided
        if search:
            query = query.filter(
                User.name.ilike(f"%{search}%") | 
                User.email.ilike(f"%{search}%")
            )
        
        # Get paginated results
        users = query.offset(skip).limit(limit).all()
        
        return [UserListItem.from_orm(user) for user in users]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users: {str(e)}"
        )

@router.get("/users/count")
async def get_users_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get total count of users (Admin only)"""
    try:
        total_count = db.query(func.count(User.id)).scalar()
        user_count = db.query(func.count(User.id)).filter(User.role == "user").scalar()
        admin_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar()
        
        return {
            "total": total_count,
            "users": user_count,
            "admins": admin_count
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user count: {str(e)}"
        )

@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a user's role (Admin only)"""
    try:
        # Find the user to update
        user_to_update = db.query(User).filter(User.id == user_id).first()
        if not user_to_update:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent admin from changing their own role to user
        if user_to_update.id == current_user.id and role_update.role == "user":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change your own admin role"
            )
        
        # Update the user's role (convert enum to string if needed)
        new_role = role_update.role.value if hasattr(role_update.role, 'value') else role_update.role
        user_to_update.role = new_role
        db.commit()
        db.refresh(user_to_update)
        
        return UserResponse.from_orm(user_to_update)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user role: {str(e)}"
        )

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get a specific user by ID (Admin only)"""
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserResponse.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve user: {str(e)}"
        )

@router.get("/all-projects", response_model=List[ProjectSchema])
async def get_all_projects_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all projects in the system (Admin only)"""
    try:
        projects = db.query(Project).all()
        return [ProjectSchema.from_orm(project) for project in projects]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve all projects: {str(e)}"
        )

@router.get("/users-with-projects")
async def get_users_with_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get all users with their projects and work item statistics (Admin only)"""
    try:
        # Get all users
        users = db.query(User).all()
        
        # Get all projects
        projects = db.query(Project).all()
        
        # Get all work items
        work_items = db.query(WorkItem).all()
        
        # Create a mapping of projects to their work items
        project_work_items = {}
        for work_item in work_items:
            if work_item.project_id not in project_work_items:
                project_work_items[work_item.project_id] = []
            project_work_items[work_item.project_id].append(work_item)
        
        # Build the response
        users_with_projects = []
        
        for user in users:
            # Get user's projects
            user_projects = [p for p in projects if p.owner_id == user.id]
            
            # Calculate statistics for each project
            projects_with_stats = []
            for project in user_projects:
                # Get work items for this project
                project_items = project_work_items.get(project.id, [])
                
                # Count different types of work items
                epics = [item for item in project_items if item.item_type == 'epic']
                user_stories = [item for item in project_items if item.item_type == 'story']
                tasks = [item for item in project_items if item.item_type == 'task']
                subtasks = [item for item in project_items if item.item_type == 'subtask']
                
                project_data = {
                    "id": str(project.id),
                    "name": project.name,
                    "description": project.description,
                    "status": "active",  # Default status, add to model if needed
                    "created_at": project.created_at.isoformat() if project.created_at else None,
                    "statistics": {
                        "epics": len(epics),
                        "userStories": len(user_stories),
                        "tasks": len(tasks),
                        "subtasks": len(subtasks),
                        "totalWorkItems": len(project_items)
                    }
                }
                projects_with_stats.append(project_data)
            
            # Calculate total work items for user
            total_work_items = sum(p["statistics"]["totalWorkItems"] for p in projects_with_stats)
            
            user_data = {
                "id": str(user.id),
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "projects": projects_with_stats,
                "projectCount": len(user_projects),
                "totalWorkItems": total_work_items
            }
            users_with_projects.append(user_data)
        
        return users_with_projects
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve users with projects: {str(e)}"
        )