from sqlalchemy import Column, String, Numeric, Integer, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class TaskProposal(Base):
    __tablename__ = "task_proposals"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    contractor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    offered_price = Column(Numeric(10, 2), nullable=False)
    eta_minutes = Column(Integer, nullable=False)
    cover_letter = Column(String, nullable=True)
    status = Column(String(20), default="pending")

    task = relationship("Task", back_populates="proposals")
    contractor = relationship("User", back_populates="proposals")