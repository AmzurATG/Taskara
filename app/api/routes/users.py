from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.db.models.user import User, UserRole
from app.schemas.user import UserListItem, UserRoleUpdate, UserResponse
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