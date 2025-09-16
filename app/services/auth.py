from sqlalchemy.orm import Session
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.db.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenData
from app.core.security import verify_password, get_password_hash, create_access_token, verify_token
from app.db.session import get_db
from typing import Optional
import uuid

security = HTTPBearer()

class AuthService:
    
    @staticmethod
    def register_user(user_data: UserCreate, db: Session) -> User:
        """Register a new user"""
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            id=uuid.uuid4(),
            name=user_data.name,
            email=user_data.email,
            password_hash=hashed_password
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def authenticate_user(login_data: UserLogin, db: Session) -> Optional[User]:
        """Authenticate user credentials"""
        user = db.query(User).filter(User.email == login_data.email).first()
        if not user:
            return None
        
        if not user.password_hash:
            # User registered with Google OAuth only
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please login with Google"
            )
        
        if not verify_password(login_data.password, user.password_hash):
            return None
        
        return user
    
    @staticmethod
    def create_user_token(user: User) -> str:
        """Create access token for user"""
        token_data = {"sub": str(user.id)}
        return create_access_token(token_data)
    
    @staticmethod
    def get_user_by_email(email: str, db: Session) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()

# Dependency to get current user from token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            raise credentials_exception
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        token_data = TokenData(user_id=email)
    except Exception:
        raise credentials_exception
    
    user = AuthService.get_user_by_email(email=email, db=db)
    if user is None:
        raise credentials_exception
    
    return user

# Optional dependency for routes that work with or without authentication
async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            return None
        
        email: str = payload.get("sub")
        if email is None:
            return None
        
        return AuthService.get_user_by_email(email=email, db=db)
    except Exception:
        return None
