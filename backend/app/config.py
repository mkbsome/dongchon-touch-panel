from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "sqlite:///./dongchon.db"

    # API Settings
    api_title: str = "Dongchon Pickling System API"
    api_version: str = "1.0.0"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
