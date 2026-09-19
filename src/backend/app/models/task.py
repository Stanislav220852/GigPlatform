from sqlalchemy import Column, String, Numeric, DateTime, text, UUID, Boolean
from sqlalchemy.orm import relationship
from .base import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    client_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(String, nullable=False)
    category = Column(String(50), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    urgency = Column(String(20), default="today")
    geom = Column(Geometry(geometry_type="POINT", srid=4326), nullable=False)
    address_name = Column(String(255), nullable=False)
    status = Column(String(30), default="open")
    assigned_contractor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    client = relationship("User", back_populates="tasks_created")
    assigned_contractor = relationship("User", foreign_keys=[assigned_contractor_id])
    proposals = relationship("TaskProposal", back_populates="task", cascade="all, delete-orphan")
    escrow = relationship("EscrowTransaction", back_populates="task", cascade="all, delete-orphan")
    messages = relationship("ChatMessage", back_populates="task", cascade="all, delete-orphan")
