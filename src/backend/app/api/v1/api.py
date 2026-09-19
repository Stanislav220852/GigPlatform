from fastapi import APIRouter

from app.api.v1.endpoints import users, tasks, bids

api_router = APIRouter()

api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(bids.router, prefix="/bids", tags=["bids"]) 