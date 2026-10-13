import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.api.v1.api import api_router
from app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# 1. Список разрешенных адресов фронтенда
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# 2. Стандартный CORS (работает для успешных запросов)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Передаем список вместо ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Глобальный перехватчик ошибок (гарантирует CORS при падении бэкенда)
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        # Принудительно выводим ошибку в консоль бэкенда, чтобы её было видно
        print("\n" + "!"*40 + "\nОШИБКА НА БЭКЕНДЕ:\n" + traceback.format_exc() + "!"*40 + "\n")
        
        # Возвращаем фронтенду ответ с жестко прописанными CORS заголовками
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error_message": str(e)},
            headers={
                "Access-Control-Allow-Origin": "http://localhost:5173",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )

app.include_router(api_router, prefix="/api/v1")

@app.get("/healthcheck", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
