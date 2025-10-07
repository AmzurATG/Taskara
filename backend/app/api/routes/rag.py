from typing import List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.services.rag_service import rag_service
from app.core.security import get_current_user
from app.db.models.user import User

router = APIRouter()


class ChatRequest(BaseModel):
    query: str
    file_id: UUID


class ChatResponse(BaseModel):
    success: bool
    response: str = None
    file_name: str = None
    chunks_used: int = None
    error: str = None


class DocumentInfo(BaseModel):
    id: str
    file_name: str
    created_at: str
    is_indexed: bool


@router.get("/projects/{project_id}/documents", response_model=List[DocumentInfo])
def get_project_documents(
    project_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of documents available for RAG chat in a project."""
    try:
        documents = rag_service.get_project_documents(
            db=db,
            project_id=project_id,
            user_id=current_user.id
        )
        return documents
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving documents: {str(e)}"
        )


@router.post("/projects/{project_id}/chat", response_model=ChatResponse)
def chat_with_document(
    project_id: UUID,
    chat_request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Chat with a specific document using RAG."""
    try:
        result = rag_service.chat_with_document(
            db=db,
            project_id=project_id,
            file_id=chat_request.file_id,
            query=chat_request.query,
            user_id=current_user.id
        )
        
        if result["success"]:
            return ChatResponse(
                success=True,
                response=result["response"],
                file_name=result["file_name"],
                chunks_used=result["chunks_used"]
            )
        else:
            return ChatResponse(
                success=False,
                error=result["error"]
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )


@router.post("/projects/{project_id}/documents/{file_id}/index")
def index_document(
    project_id: UUID,
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Manually index a document for RAG (if not already indexed)."""
    try:
        success = rag_service.index_document(
            db=db,
            file_id=file_id,
            user_id=current_user.id
        )
        
        if success:
            return {"message": "Document indexed successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to index document"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error indexing document: {str(e)}"
        )