from sqlalchemy import Column, Numeric, DateTime, Text, Boolean, ForeignKey,Uuid,String,text
from sqlalchemy.orm import relationship
from .base import Base
import datetime

class EscrowTransaction(Base):
    __tablename__ = "escrow_transactions"

    id = Column(Uuid(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    task_id = Column(Uuid(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    fee_amount = Column(Numeric(10, 2), default=0.00)
    status = Column(String(30), default="hold")
    hold_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    released_at = Column(DateTime(timezone=True), nullable=True)

    task = relationship("Task", back_populates="escrow")
    user = relationship("User", back_populates="escrow_transactions")