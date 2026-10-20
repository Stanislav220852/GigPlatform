import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from app.core.security import create_access_token, hash_password, verify_password, get_current_user
from app.db.database import get_db
from app.models.User import User
from app.schemas.task import TaskCreate, TaskResponse, LocationSchema
from app.schemas.bid import BidCreate, BidResponse
from app.schemas.user import UserResponse


client = TestClient(app)

mock_user = User(
    id=uuid.uuid4(),
    email="test@example.com",
    password_hash="fakehash",
    full_name="Тестовый Пользователь",
    phone="+79990001122",
    role="client",
    rating=5.0
)

async def override_get_current_user():
    return mock_user

async def override_get_db():
    yield None

app.dependency_overrides[get_current_user] = override_get_current_user


def test_healthcheck():
    response = client.get("/healthcheck")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "project" in data


def test_security_passwords_and_jwt():
    pwd = "secret_password_123"
    hashed = hash_password(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False

    test_uid = str(uuid.uuid4())
    token = create_access_token(data={"sub": test_uid})
    assert isinstance(token, str)
    assert len(token) > 20


def test_openapi_schema_routes():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    paths = schema["paths"]

    # Verify our routes are properly mounted
    assert "/api/v1/tasks/" in paths
    assert "post" in paths["/api/v1/tasks/"]
    assert "get" in paths["/api/v1/tasks/"]
    assert "/api/v1/tasks/my" in paths
    assert "get" in paths["/api/v1/tasks/my"]
    assert "/api/v1/tasks/{task_id}/complete" in paths
    assert "post" in paths["/api/v1/tasks/{task_id}/complete"]

    assert "/api/v1/users/me" in paths
    assert "get" in paths["/api/v1/users/me"]
    assert "put" in paths["/api/v1/users/me"]
    assert "/api/v1/users/me/contractor-profile" in paths
    assert "put" in paths["/api/v1/users/me/contractor-profile"]

    assert "/api/v1/bids/" in paths
    assert "get" in paths["/api/v1/bids/"]
    assert "post" in paths["/api/v1/bids/"]

    assert "/api/v1/chat/{task_id}/messages" in paths
    assert "get" in paths["/api/v1/chat/{task_id}/messages"]
    assert "post" in paths["/api/v1/chat/{task_id}/messages"]
    assert "/api/v1/tasks/{task_id}/messages" in paths


def test_create_task_validation():
    # Sending invalid task data should return 422 Unprocessable Entity
    response = client.post("/api/v1/tasks/", json={"title": "T"})
    assert response.status_code == 422

    # Negative price should fail validation
    invalid_data = {
        "title": "Fix pipe",
        "description": "Urgent repair",
        "category": "repair",
        "price": -100,
        "latitude": 55.75,
        "longitude": 37.61,
        "address_name": "Moscow"
    }
    response = client.post("/api/v1/tasks/", json=invalid_data)
    assert response.status_code == 422


def test_create_bid_validation():
    # Missing required task_id, offered_price, eta_minutes
    response = client.post("/api/v1/bids/", json={})
    assert response.status_code == 422

    # Invalid negative offered_price
    response = client.post("/api/v1/bids/", json={
        "task_id": str(uuid.uuid4()),
        "offered_price": -50,
        "eta_minutes": 30
    })
    assert response.status_code == 422


def test_read_current_user_endpoint():
    response = client.get("/api/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Тестовый Пользователь"
    assert data["role"] == "client"


def test_schemas_instantiation():
    loc = LocationSchema(lat=55.75, lng=37.61, address_name="Moscow")
    task_res = TaskResponse(
        id=str(uuid.uuid4()),
        title="Delivery",
        description="Deliver document",
        category="delivery",
        price=500.0,
        urgency="today",
        location=loc,
        status="open",
        created_at=datetime.now(timezone.utc),
        client_id=str(uuid.uuid4()),
        client=UserResponse(
            id=str(uuid.uuid4()),
            email="client@example.com",
            full_name="Ivan Ivanov",
            phone="+79991234567",
            role="client",
            rating=5.0
        )
    )
    assert task_res.price == 500.0
    assert task_res.location.lat == 55.75
