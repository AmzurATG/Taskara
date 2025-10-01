from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database Configuration
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/task_generator")
    db_user: str = os.getenv("DB_USER", "postgres")
    db_password: str = os.getenv("DB_PASSWORD", "")
    db_host: str = os.getenv("DB_HOST", "localhost")
    db_port: int = int(os.getenv("DB_PORT", "5432"))
    db_name: str = os.getenv("DB_NAME", "postgres")
    
    # Supabase Configuration (Direct connection, not pooler)
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_direct_url: str = os.getenv("SUPABASE_DIRECT_URL", "")  # Direct connection URL
    
    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    # AI Configuration
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Celery Configuration  
    celery_broker_url: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:9095/0")
    celery_result_backend: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:9095/0")
    
    def get_database_url(self) -> str:
        """Get the appropriate database URL."""
        if self.supabase_direct_url:
            return self.supabase_direct_url
        elif self.database_url:
            # Return the configured URL as-is (no automatic conversion)
            return self.database_url
        else:
            return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    class Config:
        env_file = ".env"

settings = Settings()
