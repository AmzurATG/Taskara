import os
from typing import Optional
from app.core.config import settings

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


class SupabaseStorage:
    def __init__(self):
        self.client = None
        self.bucket_name = "requirement-files"  # You'll need to create this bucket in Supabase
        
        if False and SUPABASE_AVAILABLE and settings.supabase_url and settings.supabase_key:  # Temporarily disabled
            try:
                self.client = create_client(settings.supabase_url, settings.supabase_key)
            except Exception as e:
                print(f"Warning: Could not initialize Supabase client: {e}")
                self.client = None
        else:
            print("Warning: Supabase not configured or not available. Using local storage fallback.")
    
    def is_available(self) -> bool:
        """Check if Supabase storage is available and configured."""
        return self.client is not None
    
    def upload_file(self, file_path: str, file_content: bytes) -> str:
        """Upload file to Supabase storage and return the public URL."""
        if not self.is_available():
            raise Exception("Supabase storage is not available")
            
        try:
            # Upload file to Supabase storage
            response = self.client.storage.from_(self.bucket_name).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": "application/octet-stream"}
            )
            
            if hasattr(response, 'error') and response.error:
                raise Exception(f"Supabase upload error: {response.error}")
            
            # Get public URL
            public_url = self.client.storage.from_(self.bucket_name).get_public_url(file_path)
            return public_url
            
        except Exception as e:
            raise Exception(f"Failed to upload to Supabase: {str(e)}")
    
    def delete_file(self, file_path: str) -> bool:
        """Delete file from Supabase storage."""
        if not self.is_available():
            return False
            
        try:
            response = self.client.storage.from_(self.bucket_name).remove([file_path])
            return not (hasattr(response, 'error') and response.error)
        except Exception:
            return False
    
    def get_file_url(self, file_path: str) -> str:
        """Get public URL for a file."""
        if not self.is_available():
            raise Exception("Supabase storage is not available")
            
        return self.client.storage.from_(self.bucket_name).get_public_url(file_path)


# Global instance
supabase_storage = SupabaseStorage()