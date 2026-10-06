from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, computed_field, model_validator  


class Settings(BaseSettings):
    PROJECT_NAME:str = "GigPlatform"
    VERSION:str = "0.1.0"
    
    SECRET_KEY:str 
    ALGORITHM:str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES:int = 30
    
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int 
    POSTGRES_DB: str
    
    DATABASE_URL: Optional[str] = None

    # 2. Если в .env строки нет, Pydantic автоматически соберет её сам
    @model_validator(mode="after")
    
    def assemble_database_url(self) -> "Settings":
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql+asyncpg://"
                f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
                f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/"
                f"{self.POSTGRES_DB}"
            )
        return self
        
    REDIS_HOST: str
    REDIS_PORT: int
    USER_ADMIN:str
    USER_ADMIN_PASSWORD:str

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}"
    
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore"
    )  
    
settings = Settings()