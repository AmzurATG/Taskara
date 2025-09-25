import os
import uuid
from typing import List, Dict, Any, Optional
from uuid import UUID
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
import requests
import google.generativeai as genai
from sqlalchemy.orm import Session

from app.core.config import settings

# Disable ChromaDB telemetry to avoid SSL certificate issues
os.environ["ANONYMIZED_TELEMETRY"] = "False"
from app.db.models.file import File
from app.db.models.project import Project
from app.utils.pdf_utils import PDFExtractor
from app.utils.docx_utils import DOCXExtractor


class RAGService:
    def __init__(self):
        """Initialize RAG service with ChromaDB and embedding model."""
        # Initialize ChromaDB client
        chroma_path = os.path.join(os.getcwd(), "chroma_data")
        os.makedirs(chroma_path, exist_ok=True)
        
        self.chroma_client = chromadb.PersistentClient(
            path=chroma_path,
            settings=Settings(
                allow_reset=True,
                anonymized_telemetry=False  # Disable telemetry to avoid SSL issues
            )
        )
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        except Exception as e:
            print(f"Warning: Could not load embedding model: {e}")
            self.embedding_model = None
        
        # Initialize AI models
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
        
    def _get_or_create_collection(self, project_id: str) -> chromadb.Collection:
        """Get or create a ChromaDB collection for a project."""
        collection_name = f"project_{project_id}"
        try:
            # Try to get existing collection
            return self.chroma_client.get_collection(name=collection_name)
        except Exception:
            # Create new collection if it doesn't exist
            return self.chroma_client.create_collection(
                name=collection_name,
                metadata={"project_id": project_id}
            )
    
    def _extract_text_from_file(self, file_path: str, file_name: str) -> str:
        """Extract text content from uploaded file."""
        try:
            if file_name.lower().endswith('.pdf'):
                return PDFExtractor.extract_text_from_pdf(file_path)
            elif file_name.lower().endswith(('.docx', '.doc')):
                return DOCXExtractor.extract_text_from_docx(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_name}")
        except Exception as e:
            print(f"Error extracting text from {file_name}: {e}")
            return ""
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks."""
        if not text.strip():
            return []
        
        chunks = []
        start = 0
        text_length = len(text)
        
        while start < text_length:
            end = start + chunk_size
            chunk = text[start:end]
            
            # Find a good breaking point (end of sentence or paragraph)
            if end < text_length:
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')
                break_point = max(last_period, last_newline)
                
                if break_point > start + chunk_size // 2:
                    chunk = text[start:break_point + 1]
                    end = break_point + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
            
        return [chunk for chunk in chunks if chunk.strip()]
    
    def _generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks."""
        if not self.embedding_model:
            # Fallback to dummy embeddings if model not available
            return [[0.0] * 384 for _ in texts]
        
        try:
            embeddings = self.embedding_model.encode(texts)
            return embeddings.tolist()
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return [[0.0] * 384 for _ in texts]
    
    def index_document(self, db: Session, file_id: UUID, user_id: UUID) -> bool:
        """Index a document in ChromaDB for RAG retrieval."""
        try:
            # Get file from database
            file_obj = db.query(File).filter(
                File.id == file_id,
                File.uploaded_by == user_id
            ).first()
            
            if not file_obj:
                raise ValueError("File not found or access denied")
            
            # Verify project access
            project = db.query(Project).filter(
                Project.id == file_obj.project_id,
                Project.owner_id == user_id
            ).first()
            
            if not project:
                raise ValueError("Project not found or access denied")
            
            # Extract text from file
            text_content = self._extract_text_from_file(
                file_obj.storage_path, 
                file_obj.file_name
            )
            
            if not text_content.strip():
                print(f"Warning: No text content extracted from {file_obj.file_name}")
                return False
            
            # Chunk the text
            chunks = self._chunk_text(text_content)
            if not chunks:
                print(f"Warning: No text chunks created from {file_obj.file_name}")
                return False
            
            # Generate embeddings
            embeddings = self._generate_embeddings(chunks)
            
            # Get or create collection for the project
            collection = self._get_or_create_collection(str(file_obj.project_id))
            
            # Create document IDs for chunks
            chunk_ids = [f"{file_id}_{i}" for i in range(len(chunks))]
            
            # Create metadata for each chunk
            metadatas = []
            for i, chunk in enumerate(chunks):
                metadatas.append({
                    "file_id": str(file_id),
                    "file_name": file_obj.file_name,
                    "project_id": str(file_obj.project_id),
                    "chunk_index": i,
                    "chunk_size": len(chunk)
                })
            
            # Add to ChromaDB collection
            collection.add(
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
                ids=chunk_ids
            )
            
            print(f"Successfully indexed {len(chunks)} chunks from {file_obj.file_name}")
            return True
            
        except Exception as e:
            print(f"Error indexing document {file_id}: {e}")
            return False
    
    def get_project_documents(self, db: Session, project_id: UUID, user_id: UUID) -> List[Dict[str, Any]]:
        """Get list of indexed documents for a project."""
        try:
            # Verify project access
            project = db.query(Project).filter(
                Project.id == project_id,
                Project.owner_id == user_id
            ).first()
            
            if not project:
                return []
            
            # Get all files for the project
            files = db.query(File).filter(
                File.project_id == project_id
            ).all()
            
            # Check which files are indexed in ChromaDB
            indexed_files = []
            try:
                collection = self._get_or_create_collection(str(project_id))
                
                for file_obj in files:
                    # Check if file has any chunks in the collection
                    try:
                        results = collection.get(
                            where={"file_id": str(file_obj.id)},
                            limit=1
                        )
                        
                        if results['ids']:  # File has indexed chunks
                            indexed_files.append({
                                "id": str(file_obj.id),
                                "file_name": file_obj.file_name,
                                "created_at": file_obj.created_at.isoformat(),
                                "is_indexed": True
                            })
                        else:
                            indexed_files.append({
                                "id": str(file_obj.id),
                                "file_name": file_obj.file_name,
                                "created_at": file_obj.created_at.isoformat(),
                                "is_indexed": False
                            })
                    except Exception:
                        # File not indexed
                        indexed_files.append({
                            "id": str(file_obj.id),
                            "file_name": file_obj.file_name,
                            "created_at": file_obj.created_at.isoformat(),
                            "is_indexed": False
                        })
                        
            except Exception:
                # Collection doesn't exist, no files are indexed
                for file_obj in files:
                    indexed_files.append({
                        "id": str(file_obj.id),
                        "file_name": file_obj.file_name,
                        "created_at": file_obj.created_at.isoformat(),
                        "is_indexed": False
                    })
            
            return indexed_files
            
        except Exception as e:
            print(f"Error getting project documents: {e}")
            return []
    
    def _retrieve_relevant_chunks(
        self, 
        query: str, 
        project_id: UUID, 
        file_id: UUID, 
        top_k: int = 5
    ) -> List[str]:
        """Retrieve relevant document chunks for a query."""
        try:
            collection = self._get_or_create_collection(str(project_id))
            
            # Generate query embedding
            query_embedding = self._generate_embeddings([query])[0]
            
            # Search for relevant chunks from the specific file
            results = collection.query(
                query_embeddings=[query_embedding],
                where={"file_id": str(file_id)},
                n_results=top_k
            )
            
            if results['documents'] and len(results['documents']) > 0:
                return results['documents'][0]  # ChromaDB returns nested lists
            else:
                return []
                
        except Exception as e:
            print(f"Error retrieving chunks: {e}")
            return []
    
    def _generate_rag_response(self, query: str, context_chunks: List[str], file_name: str) -> str:
        """Generate response using retrieved context and LLM."""
        if not context_chunks:
            return "I couldn't find relevant information in the document to answer your question."
        
        # Combine context chunks
        context = "\n\n".join(context_chunks)
        
        # Create prompt for RAG
        prompt = f"""You are a helpful assistant that answers questions based solely on the provided document content.

DOCUMENT: {file_name}

CONTEXT FROM DOCUMENT:
{context}

QUESTION: {query}

INSTRUCTIONS:
1. Answer the question based ONLY on the information provided in the context above
2. If the context doesn't contain information to answer the question, say so clearly
3. Be specific and cite relevant parts of the document when possible
4. Do not make up information not present in the context
5. Keep your response focused and relevant to the question

ANSWER:"""

        try:
            # Try Gemini first
            if settings.gemini_api_key:
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.3,
                        max_output_tokens=1000,
                    )
                )
                return response.text
                
        except Exception as e:
            print(f"Error with Gemini: {e}")
        
        try:
            # Fallback to OpenRouter
            if settings.openrouter_api_key:
                headers = {
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "Content-Type": "application/json"
                }
                
                payload = {
                    "model": "anthropic/claude-3-haiku:beta",
                    "messages": [
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.3,
                    "max_tokens": 1000
                }
                
                response = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                    
        except Exception as e:
            print(f"Error with OpenRouter: {e}")
        
        # Fallback response
        return f"I found the following relevant information in {file_name}:\n\n" + "\n\n".join(context_chunks[:2])
    
    def chat_with_document(
        self, 
        db: Session, 
        project_id: UUID, 
        file_id: UUID, 
        query: str, 
        user_id: UUID
    ) -> Dict[str, Any]:
        """Chat with a specific document using RAG."""
        try:
            # Verify access to project and file
            project = db.query(Project).filter(
                Project.id == project_id,
                Project.owner_id == user_id
            ).first()
            
            if not project:
                return {
                    "success": False,
                    "error": "Project not found or access denied"
                }
            
            file_obj = db.query(File).filter(
                File.id == file_id,
                File.project_id == project_id
            ).first()
            
            if not file_obj:
                return {
                    "success": False,
                    "error": "File not found in this project"
                }
            
            # Retrieve relevant chunks
            relevant_chunks = self._retrieve_relevant_chunks(
                query=query,
                project_id=project_id,
                file_id=file_id,
                top_k=5
            )
            
            if not relevant_chunks:
                # Try to index the document if it's not indexed
                index_success = self.index_document(db, file_id, user_id)
                if index_success:
                    # Retry retrieval after indexing
                    relevant_chunks = self._retrieve_relevant_chunks(
                        query=query,
                        project_id=project_id,
                        file_id=file_id,
                        top_k=5
                    )
            
            # Generate response
            response = self._generate_rag_response(
                query=query,
                context_chunks=relevant_chunks,
                file_name=file_obj.file_name
            )
            
            return {
                "success": True,
                "response": response,
                "file_name": file_obj.file_name,
                "chunks_used": len(relevant_chunks)
            }
            
        except Exception as e:
            print(f"Error in chat_with_document: {e}")
            return {
                "success": False,
                "error": f"An error occurred: {str(e)}"
            }


# Global RAG service instance
rag_service = RAGService()