from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Union
from datetime import datetime
import uuid
from app.db.models.user import UserRole

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Union[UserRole, str] = "user"  # Accept both enum and string
    
    @validator('role', pre=True)
    def convert_role(cls, v):
        """Convert string role to enum if needed"""
        if isinstance(v, str):
            return v.lower()  # Ensure lowercase
        return v.value if hasattr(v, 'value') else v

class UserCreate(UserBase):
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str  # Return role as string
    google_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: Union[UserRole, str]  # Accept both enum and string
    
    @validator('role', pre=True)
    def convert_role(cls, v):
        """Convert role to string if needed"""
        if isinstance(v, str):
            return v.lower()  # Ensure lowercase
        return v.value if hasattr(v, 'value') else v

class UserListItem(BaseModel):
    id: uuid.UUID
    name: str
    email: EmailStr
    role: str  # Return role as string
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
