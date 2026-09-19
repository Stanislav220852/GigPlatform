from fastapi import FastAPI
from app.api import api_router

app = FastAPI(title="GigPlatform API", version="1.0.0")

app.include_router(api_router)