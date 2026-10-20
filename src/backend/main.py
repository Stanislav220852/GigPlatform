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

# Разрешенные адреса для CORS (поддерживает любые порты localhost: 3000, 3001, 5173 и т.д.)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Глобальный перехватчик ошибок (гарантирует CORS при падении бэкенда)
@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        print("\n" + "!" * 40 + "\nОШИБКА НА БЭКЕНДЕ:\n" + traceback.format_exc() + "!" * 40 + "\n")
        origin = request.headers.get("origin") or "http://localhost:3000"

        return JSONResponse(
            status_code=500,
            content={"detail": "Internal Server Error", "error_message": str(e)},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "*",
                "Access-Control-Allow-Headers": "*"
            }
        )


app.include_router(api_router, prefix="/api/v1")


@app.get("/healthcheck", tags=["System"])
@app.get("/api/v1/healthcheck", tags=["System"])
async def health_check():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
