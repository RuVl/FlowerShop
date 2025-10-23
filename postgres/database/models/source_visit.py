from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship

from .base import Base


class SourceVisit(Base):
    __tablename__ = 'source_visits'

    id = Column(BigInteger, primary_key=True)

    source_id = Column(BigInteger, ForeignKey('sources.id'))
    user_id = Column(BigInteger)

    phone_number = Column(String, nullable=True)
    visited_at = Column(DateTime, default=func.now())

    source = relationship("Source", back_populates="visits", foreign_keys=[source_id])
