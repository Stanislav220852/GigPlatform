from sqlalchemy import Column, String, Numeric, DateTime, text, UUID
from sqlalchemy.orm import relationship
import datetime
from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    role = Column(String(20), nullable=False)
    rating = Column(Numeric(3, 2), default=5.00)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    tasks_created = relationship(
    "Task", 
    foreign_keys="Task.client_id", 
    back_populates="client"
)
    proposals = relationship("TaskProposal", back_populates="contractor")
    escrow_transactions = relationship("EscrowTransaction", back_populates="user")
    messages_sent = relationship("ChatMessage", back_populates="sender")
    contractor_profile = relationship("ContractorProfile", back_populates="user", uselist=False)
