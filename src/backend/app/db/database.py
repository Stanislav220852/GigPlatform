from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from src.backend.app.core.config import settings
from sqlalchemy import MetaData




POSTGRES_NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


engine = create_async_engine(
    settings.DATABASE_URL,        
    pool_pre_ping=True      
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False       
)

class Base(DeclarativeBase):
     metadata = MetaData(naming_convention=POSTGRES_NAMING_CONVENTION)

async def get_db():
    async with async_session_maker() as session:
        yield session