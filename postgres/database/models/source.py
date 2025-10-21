from sqlalchemy import Column, BigInteger, String, DateTime, func
from sqlalchemy.orm import relationship

from database.models import Base


class Source(Base):
    __tablename__ = 'sources'

    id = Column(BigInteger, primary_key=True)

    start_param = Column(String, unique=True, nullable=False)  # promo2024, vk_ads, etc.
    note = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())

    visits = relationship("SourceVisit", back_populates="source", foreign_keys="SourceVisit.source_id")
