from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.api import api_router
from app.core.config import settings
from pydantic import BaseModel, EmailStr
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.get("/healthcheck", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }
    
# 1. Описываем схему, которую ожидает получить фронтенд
class MockRegisterResponse(BaseModel):
    id: str = "a18778d5-ca56-4b2b-9e1c-3f5d7a8b0c2d"  # Любой тестовый UUID
    email: EmailStr
    full_name: str = "Тестовый Пользователь"
    role: str = "client"  # или 'contractor'

# 2. Создаем временную ручку регистрации
@app.post("/api/v1/auth/register", response_model=MockRegisterResponse)
async def mock_register(payload: dict): # принимает любые данные от фронта
    return {
        "id": "a18778d5-ca56-4b2b-9e1c-3f5d7a8b0c2d",
        "email": payload.get("email", "test@example.com"),
        "full_name": payload.get("full_name", "Тестовый Пользователь"),
        "role": payload.get("role", "client")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)