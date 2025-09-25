#!/usr/bin/env python3
"""
Script to index existing documents for RAG functionality.
This script will go through all files in the database and index them in ChromaDB.
"""

import os
import sys

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models.file import File
from app.db.models.project import Project
from app.services.rag_service import rag_service


def index_all_documents():
    """Index all documents in the database for RAG functionality."""
    db = SessionLocal()
    
    try:
        # Get all files from the database
        files = db.query(File).all()
        print(f"Found {len(files)} files in database")
        
        if not files:
            print("No files found to index")
            return
        
        indexed_count = 0
        failed_count = 0
        
        for file_obj in files:
            try:
                print(f"\nIndexing file: {file_obj.file_name} (ID: {file_obj.id})")
                print(f"  Project: {file_obj.project_id}")
                print(f"  Storage path: {file_obj.storage_path}")
                print(f"  Uploaded by: {file_obj.uploaded_by}")
                
                # Index the document
                success = rag_service.index_document(
                    db=db,
                    file_id=file_obj.id,
                    user_id=file_obj.uploaded_by
                )
                
                if success:
                    print(f"  ✅ Successfully indexed: {file_obj.file_name}")
                    indexed_count += 1
                else:
                    print(f"  ❌ Failed to index: {file_obj.file_name}")
                    failed_count += 1
                    
            except Exception as e:
                print(f"  ❌ Error indexing {file_obj.file_name}: {str(e)}")
                failed_count += 1
        
        print(f"\n📊 Indexing Summary:")
        print(f"  ✅ Successfully indexed: {indexed_count}")
        print(f"  ❌ Failed to index: {failed_count}")
        print(f"  📊 Total files: {len(files)}")
        
        # Verify indexing by checking project documents
        print(f"\n🔍 Verifying indexing results...")
        projects = db.query(Project).all()
        
        for project in projects:
            try:
                documents = rag_service.get_project_documents(
                    db=db,
                    project_id=project.id,
                    user_id=project.owner_id
                )
                
                if documents:
                    indexed_docs = [doc for doc in documents if doc['is_indexed']]
                    print(f"  Project '{project.name}': {len(indexed_docs)}/{len(documents)} documents indexed")
                    
                    for doc in documents:
                        status = "✅" if doc['is_indexed'] else "❌"
                        print(f"    {status} {doc['file_name']}")
                        
            except Exception as e:
                print(f"  Error checking project {project.name}: {str(e)}")
        
    except Exception as e:
        print(f"Error during indexing: {str(e)}")
        
    finally:
        db.close()


if __name__ == "__main__":
    print("🚀 Starting document indexing for RAG functionality...")
    index_all_documents()
    print("\n🎉 Document indexing completed!")