import asyncio
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# 1. Специфичный фикс для Windows + Python 3.14 (исправляет зависание сокетов)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 2. Добавляем текущую директорию в пути Python, чтобы импорты из вашего проекта работали
sys.path.insert(0, ".")

# 3. Импортируем ваш Pydantic config и Base-класс ваших моделей
# ВНИМАНИЕ: Проверьте правильность путей импорта под ваш проект!
from app.core.config import settings  

from app.models.base import Base
from app.models.chat_message import ChatMessage
from app.models.contractor_profile import ContractorProfile
from app.models.escrow_transaction import EscrowTransaction
from app.models.task import Task
from app.models.task_proposal import TaskProposal
from app.models.User import User

# Стандартный конфиг Alembic для логов
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 4. Привязываем метадату ваших моделей для работы --autogenerate
target_metadata = Base.metadata

# 5. Формируем асинхронную строку подключения. 
# Для локального запуска Alembic из Windows ВСЕГДА используем 127.0.0.1 вместо 'db'
postgres_url = settings.DATABASE_URL
config.set_main_option("sqlalchemy.url", postgres_url)


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
    print("Offline migrations completed.")
else:
    asyncio.run(run_migrations_online())
    print("Online migrations completed.")
