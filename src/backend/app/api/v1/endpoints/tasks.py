from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from geoalchemy2.functions import ST_DWithin, ST_Point
from app.db.database import get_db
from app.models.task import Task
from app.models.User import User
import uuid

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
        .where(ST_DWithin(Task.geom, point, radius))
        .where(Task.status == "open")
    )
    tasks = result.scalars().all()
    
    tasks_response = []
    for task in tasks:
        client_result = await db.execute(select(User).filter(User.id == task.client_id))
        client = client_result.scalar_one_or_none()
        tasks_response.append({
            "id": str(task.id),
            "title": task.title,
            "description": task.description,
            "category": task.category,
            "price": float(task.price) if task.price else 0,
            "urgency": task.urgency,
            "location": {
                "lat": float(task.geom.y),  # Быстрый доступ к геометрии
                "lng": float(task.geom.x),
                "address_name": task.address_name
            },
            "status": task.status,
            "created_at": task.created_at,
            "client_id": str(task.client_id),
            "client": {
                "id": str(client.id) if client else None,
                "full_name": client.full_name if client else "Unknown",
                "role": client.role if client else "client"
            } if client else None
        })
    
    return tasks_response

@router.post("/", response_model=dict)
async def create_task(
    task_data: dict,
    db: AsyncSession = Depends(get_db)
):
    # Простой тестовый пользователь для создания задач
    result = await db.execute(select(User).limit(1))
    client = result.scalar_one_or_none()
    
    if not client:
        raise HTTPException(status_code=400, detail="Нет зарегистрированных пользователей")
    
    # Создаем задачу (в реальности нужно правильное преобразование геометрии)
    new_task = Task(
        client_id=client.id,
        title=task_data.get("title"),
        description=task_data.get("description"),
        category=task_data.get("category", "other"),
        price=task_data.get("price"),
        urgency=task_data.get("urgency", "flexible"),
        address_name=task_data.get("address_name"),
        status="open"
    )
    
    # Устанавливаем местоположение (в реальности нужно использовать PostGIS)
    from sqlalchemy import text
    await db.execute(
        text(f"UPDATE tasks SET location = ST_SetPoint(location, 0, ST_MakePoint({task_data.get('longitude')}, {task_data.get('latitude')})) WHERE id = '{new_task.id}'")
    )
    
    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)
    
    return {
        "id": str(new_task.id),
        "title": new_task.title,
        "description": new_task.description,
        "category": new_task.category,
        "price": float(new_task.price) if new_task.price else 0,
        "urgency": new_task.urgency,
        "location": {
            "lat": task_data.get("latitude"),
            "lng": task_data.get("longitude"),
            "address_name": new_task.address_name
        },
        "status": new_task.status,
        "created_at": new_task.created_at,
        "client_id": str(new_task.client_id)
    }

@router.get("/{task_id}", response_model=dict)
async def read_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).filter(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    client_result = await db.execute(select(User).filter(User.id == task.client_id))
    client = client_result.scalar_one_or_none()
    
    return {
        "id": str(task.id),
        "title": task.title,
        "description": task.description,
        "category": task.category,
        "price": float(task.price) if task.price else 0,
        "urgency": task.urgency,
        "location": {
            "lat": float(task.geom.y) if task.geom else None,
            "lng": float(task.geom.x) if task.geom else None,
            "address_name": task.address_name
        },
        "status": task.status,
        "created_at": task.created_at,
        "client_id": str(task.client_id),
        "client": {
            "id": str(client.id) if client else None,
            "full_name": client.full_name if client else "Unknown",
            "role": client.role if client else "client"
        } if client else None
    }

@router.delete("/{task_id}", response_model=dict)
async def delete_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).filter(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    
    await db.delete(task)
    await db.commit()
    
    return {"message": "Task deleted successfully", "id": str(task_id)}
