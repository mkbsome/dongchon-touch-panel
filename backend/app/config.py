from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Local Database (SQLite)
    database_url: str = "sqlite:///./dongchon.db"

    # Remote Database (RDS PostgreSQL)
    rds_host: str = "triflow-db.cn88cwwm6cgt.ap-northeast-2.rds.amazonaws.com"
    rds_port: int = 5432
    rds_database: str = "triflow_ai"
    rds_user: str = "triflow_admin"
    rds_password: str = "tri878993+"
    rds_enabled: bool = True  # RDS 동기화 활성화 여부

    # API Settings
    api_title: str = "Dongchon Pickling System API"
    api_version: str = "1.0.0"

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"

    @property
    def rds_url(self) -> str:
        return f"postgresql://{self.rds_user}:{self.rds_password}@{self.rds_host}:{self.rds_port}/{self.rds_database}"


settings = Settings()
