from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from geoalchemy2.functions import ST_DWithin, ST_Point
from app.db.session import get_db
from app.models.task import Task

router = APIRouter()

@router.get("/")
async def read_tasks(
    latitude: float, 
    longitude: float, 
    radius: int = 5000, 
    db: AsyncSession = Depends(get_db)
):
    point = ST_Point(longitude, latitude)
    result = await db.execute(
        select(Task)
        .where(ST_DWithin(Task.location, point, radius))
        .where(Task.status == "open")
    )
    tasks = result.scalars().all()
    return tasks