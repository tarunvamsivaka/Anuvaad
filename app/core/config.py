"""
Anuvaad Core Configuration Module
Adheres to Pydantic V2 settings management with zero-budget defaults.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "Anuvaad AI Code Translation Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")
    
    # Security & Zero Code Retention (ZDR)
    ZDR_SECRET_KEY: str = Field(
        default="anuvaad-ephemeral-zdr-secret-key-change-in-production-32bytes",
        description="HMAC secret used to generate cryptographic audit digests without retaining source code"
    )
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://anuvaad.vercel.app",
        "https://*.vercel.app",
    ]
    
    # AI Gateway - Free Tier Priority (Cerebras Tier 1 -> Gemini Flash 2.0 Tier 2 -> Fallback)
    CEREBRAS_API_KEY: Optional[str] = Field(default=None, description="Cerebras Llama 3.3 70B fast LPU key")
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"
    CEREBRAS_MODEL: str = "llama3.3-70b"
    
    GEMINI_API_KEY: Optional[str] = Field(default=None, description="Google Gemini 2.0 Flash API key")
    GEMINI_MODEL: str = "gemini-2.0-flash"
    
    DEEPSEEK_API_KEY: Optional[str] = Field(default=None, description="DeepSeek V3 / R1 fallback")
    
    # Database - Supabase PostgreSQL (Never hardcode remote credentials in code)
    SUPABASE_DB_URL: Optional[str] = Field(
        default=None,
        description="Asyncpg database URL; must be provided via environment variables"
    )
    
    # Cache - Upstash Redis
    UPSTASH_REDIS_URL: Optional[str] = Field(default=None, description="Upstash Redis URL")
    UPSTASH_REDIS_TOKEN: Optional[str] = Field(default=None, description="Upstash Redis Token")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
