from functools import lru_cache
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

load_dotenv()

class Settings(BaseSettings):
    APP_NAME: str = "Production RBAC RAG API"
    DATABASE_ADMIN_URL: str
    DATABASE_APP_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    JWT_SECRET_KEY: str = "super-secret-change-in-prod-key-256-bits"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-base-en-v1.5"
    EMBEDDING_DIM: int = 768
    RERANKER_MODEL_NAME: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    LLM_API_KEY: str = "sk-your-key-here"
    LLM_MODEL_TAGGER: str = "gpt-4o-mini"
    LLM_MODEL_GENERATOR: str = "gpt-4o-mini"
    AUTO_APPROVE_CONFIDENCE_THRESHOLD: float = 0.90
    RAW_UPLOAD_DIR: str = "storage/raw_uploads"
    ANNOTATED_PDF_DIR: str = "storage/annotated_pdfs"
    RETRIEVAL_LOG_ENABLED: bool = True
    RETRIEVAL_LOG_DIR: str = "storage/retrieval_logs"
    SEED_DEMO_USERS: bool = False
    DEMO_PASSWORD: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache()
def get_settings() -> Settings:
    return Settings()
