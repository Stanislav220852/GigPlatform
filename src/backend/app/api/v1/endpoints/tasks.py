import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, or_
from sqlalchemy.orm import joinedload
from geoalchemy2 import Geography, WKTElement
from geoalchemy2.functions import ST_DWithin, ST_Point, ST_SetSRID, ST_X, ST_Y

from app.db.database import get_db
from app.models.task import Task
from app.models.User import User
from app.models.contractor_profile import ContractorProfile
from app.models.task_proposal import TaskProposal
from app.core.security import get_current_user
from app.schemas.task import TaskCreate, TaskResponse, TaskCompleteRequest, LocationSchema
from app.schemas.user import UserResponse

router = APIRouter()


def build_task_response(task: Task, lng: Optional[float] = None, lat: Optional[float] = None) -> TaskResponse:
    return TaskResponse(
        id=str(task.id),
        title=task.title,
        description=task.description,
        category=task.category,
        price=float(task.price) if task.price else 0.0,
        urgency=task.urgency,
        location=LocationSchema(
            lat=float(lat) if lat is not None else 53.9045,
            lng=float(lng) if lng is not None else 27.5615,
            address_name=task.address_name
        ),
        status=task.status,
        created_at=task.created_at,
        client_id=str(task.client_id),
        client=UserResponse(
            id=str(task.client.id),
            email=task.client.email,
            full_name=task.client.full_name,
            phone=task.client.phone,
            role=task.client.role,
            rating=float(task.client.rating) if task.client.rating else 5.0
        ) if task.client else None,
        assigned_contractor_id=str(task.assigned_contractor_id) if task.assigned_contractor_id else None,
        assigned_contractor=UserResponse(
            id=str(task.assigned_contractor.id),
            email=task.assigned_contractor.email,
            full_name=task.assigned_contractor.full_name,
            phone=task.assigned_contractor.phone,
            role=task.assigned_contractor.role,
            rating=float(task.assigned_contractor.rating) if task.assigned_contractor.rating else 5.0
        ) if task.assigned_contractor else None
    )


@router.get("/", response_model=List[TaskResponse])
async def read_tasks(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    radius: Optional[int] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = "open",
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Task, ST_X(Task.geom).label("lng"), ST_Y(Task.geom).label("lat"))
        .options(joinedload(Task.client), joinedload(Task.assigned_contractor))
    )

    if status_filter and status_filter != "all":
        query = query.where(Task.status == status_filter)

    if latitude is not None and longitude is not None and radius and radius > 0:
        point = cast(ST_SetSRID(ST_Point(longitude, latitude), 4326), Geography)
        task_geom_geog = cast(Task.geom, Geography)
        query = query.where(ST_DWithin(task_geom_geog, point, radius))

    if category and category != "all":
        query = query.where(Task.category == category)

    result = await db.execute(query)
    rows = result.all()

    return [build_task_response(task, lng, lat) for task, lng, lat in rows]


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    geom_ewkt = f"SRID=4326;POINT({task_in.longitude} {task_in.latitude})"

    new_task = Task(
        client_id=current_user.id,
        title=task_in.title,
        description=task_in.description,
        category=task_in.category,
        price=task_in.price,
        urgency=task_in.urgency,
        address_name=task_in.address_name,
        status="open",
        geom=WKTElement(geom_ewkt, srid=4326)
    )

    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    new_task.client = current_user
    return build_task_response(new_task, task_in.longitude, task_in.latitude)


@router.get("/my", response_model=List[TaskResponse])
async def read_my_tasks(
    filter_type: Optional[str] = Query("all", description="all, created, assigned, bid"),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение списка задач текущего пользователя (созданных им, назначенных ему или на которые оставлен отклик)
    """
    query = (
        select(Task, ST_X(Task.geom).label("lng"), ST_Y(Task.geom).label("lat"))
        .options(joinedload(Task.client), joinedload(Task.assigned_contractor))
    )

    if filter_type == "created":
        query = query.where(Task.client_id == current_user.id)
    elif filter_type == "assigned":
        query = query.where(Task.assigned_contractor_id == current_user.id)
    elif filter_type == "bid":
        bid_subquery = select(TaskProposal.task_id).where(TaskProposal.contractor_id == current_user.id)
        query = query.where(Task.id.in_(bid_subquery))
    else:  # "all"
        bid_subquery = select(TaskProposal.task_id).where(TaskProposal.contractor_id == current_user.id)
        query = query.where(
            or_(
                Task.client_id == current_user.id,
                Task.assigned_contractor_id == current_user.id,
                Task.id.in_(bid_subquery)
            )
        )

    if status and status != "all":
        query = query.where(Task.status == status)

    query = query.order_by(Task.created_at.desc())

    result = await db.execute(query)
    rows = result.all()

    return [build_task_response(task, lng, lat) for task, lng, lat in rows]


@router.get("/{task_id}", response_model=TaskResponse)
async def read_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Task, ST_X(Task.geom).label("lng"), ST_Y(Task.geom).label("lat"))
        .options(joinedload(Task.client), joinedload(Task.assigned_contractor))
        .filter(Task.id == task_id)
    )
    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task, lng, lat = row
    return build_task_response(task, lng, lat)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: uuid.UUID,
    complete_in: TaskCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Завершение задачи клиентом и выставление оценки исполнителю"""
    stmt = (
        select(Task, ST_X(Task.geom).label("lng"), ST_Y(Task.geom).label("lat"))
        .options(joinedload(Task.client), joinedload(Task.assigned_contractor))
        .filter(Task.id == task_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task, lng, lat = row

    if task.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только автор может завершить задание")

    if task.status != "in_progress":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Задание должно быть в статусе 'В работе'")

    task.status = "completed"

    # Если клиент оставил оценку и есть исполнитель — обновляем рейтинг мастера
    if complete_in.rating and task.assigned_contractor_id:
        contractor = task.assigned_contractor
        if contractor:
            # Обновление скользящего рейтинга
            current_rating = float(contractor.rating) if contractor.rating else 5.0
            new_rating = round((current_rating * 4.0 + float(complete_in.rating)) / 5.0, 2)
            contractor.rating = new_rating

            # Увеличиваем счетчик выполненных задач у мастера
            prof_res = await db.execute(select(ContractorProfile).filter(ContractorProfile.user_id == contractor.id))
            prof = prof_res.scalar_one_or_none()
            if prof:
                prof.completed_tasks_count = (prof.completed_tasks_count or 0) + 1

    await db.commit()
    await db.refresh(task)

    return build_task_response(task, lng, lat)


@router.post("/{task_id}/cancel", response_model=TaskResponse)
async def cancel_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Отмена задачи автором"""
    stmt = (
        select(Task, ST_X(Task.geom).label("lng"), ST_Y(Task.geom).label("lat"))
        .options(joinedload(Task.client), joinedload(Task.assigned_contractor))
        .filter(Task.id == task_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    task, lng, lat = row

    if task.client_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Только автор может отменить задание")

    task.status = "cancelled"
    await db.commit()
    await db.refresh(task)

    return build_task_response(task, lng, lat)


@router.delete("/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Task).filter(Task.id == task_id))
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.client_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this task")

    await db.delete(task)
    await db.commit()

    return {"message": "Task deleted successfully", "id": str(task_id)}


from app.api.v1.endpoints.chat import get_task_messages, send_task_message
from app.schemas.chat import ChatMessageResponse

router.add_api_route("/{task_id}/messages", get_task_messages, methods=["GET"], response_model=List[ChatMessageResponse])
router.add_api_route("/{task_id}/messages", send_task_message, methods=["POST"], response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)

