"""Initial async migration

Revision ID: a18778d5ca56
Revises: 
Create Date: 2026-10-06 11:21:59.017432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2 

# revision identifiers, used by Alembic.
revision: str = 'a18778d5ca56'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Создаем таблицу пользователей
    op.create_table('users',
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('rating', sa.Numeric(precision=3, scale=2), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )

    # 2. Создаем профили исполнителей
    op.create_table('contractor_profiles',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('bio', sa.String(), nullable=True),
    sa.Column('categories', sa.String(), nullable=False),
    sa.Column('has_own_tools', sa.Boolean(), nullable=True),
    sa.Column('is_verified', sa.Boolean(), nullable=True),
    sa.Column('completed_tasks_count', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('user_id')
    )

    # 3. Создаем задачи (Колонка 'geom' сама создаст нужный индекс)
    op.create_table('tasks',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('client_id', sa.Uuid(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('description', sa.String(), nullable=False),
    sa.Column('category', sa.String(length=50), nullable=False),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('urgency', sa.String(length=20), nullable=True),
    sa.Column('geom', geoalchemy2.types.Geometry(geometry_type='POINT', srid=4326, dimension=2, from_text='ST_GeomFromEWKT', name='geometry', nullable=False), nullable=False),
    sa.Column('address_name', sa.String(length=255), nullable=False),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('assigned_contractor_id', sa.Uuid(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['assigned_contractor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # 4. Создаем сообщения чата
    op.create_table('chat_messages',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('task_id', sa.Uuid(), nullable=False),
    sa.Column('sender_id', sa.Uuid(), nullable=False),
    sa.Column('message_text', sa.String(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )

    # 5. Создаем безопасные сделки
    op.create_table('escrow_transactions',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('task_id', sa.Uuid(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('fee_amount', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('status', sa.String(length=30), nullable=True),
    sa.Column('hold_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('released_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # 6. Создаем отклики на задачи
    op.create_table('task_proposals',
    sa.Column('id', sa.Uuid(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('task_id', sa.Uuid(), nullable=False),
    sa.Column('contractor_id', sa.Uuid(), nullable=False),
    sa.Column('offered_price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('eta_minutes', sa.Integer(), nullable=False),
    sa.Column('cover_letter', sa.String(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=True),
    sa.ForeignKeyConstraint(['contractor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('task_proposals')
    op.drop_table('escrow_transactions')
    op.drop_table('chat_messages')
    op.drop_table('tasks')
    op.drop_table('contractor_profiles')
    op.drop_table('users')
