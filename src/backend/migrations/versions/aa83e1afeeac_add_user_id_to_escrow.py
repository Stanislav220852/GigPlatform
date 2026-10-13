"""add_user_id_to_escrow

Revision ID: aa83e1afeeac
Revises: a18778d5ca56
Create Date: 2026-10-13 12:51:35.621937

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'aa83e1afeeac'
down_revision: Union[str, None] = 'a18778d5ca56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Оставляем ТОЛЬКО добавление нужной нам колонки и внешнего ключа:
    op.add_column('escrow_transactions', sa.Column('user_id', sa.Uuid(), nullable=False))
    op.create_foreign_key('fk_escrow_transactions_user_id', 'escrow_transactions', 'users', ['user_id'], ['id'])
    


def downgrade() -> None:
    op.drop_constraint('fk_escrow_transactions_user_id', 'escrow_transactions', type_='foreignkey')
    op.drop_column('escrow_transactions', 'user_id')