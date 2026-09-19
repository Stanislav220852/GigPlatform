from sqlalchemy import Column, String, Boolean, Integer,ForeignKey, UUID
from sqlalchemy.orm import relationship
from .base import Base


class ContractorProfile(Base):
    __tablename__ = "contractor_profiles"

    user_id = Column(UUID(as_uuid=True),  ForeignKey("users.id", ondelete="CASCADE"),primary_key=True)
    bio = Column(String, nullable=True)
    categories = Column(String, nullable=False)
    has_own_tools = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    completed_tasks_count = Column(Integer, default=0)

    user = relationship("User", back_populates="contractor_profile")
