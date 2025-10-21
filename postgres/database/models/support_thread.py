from sqlalchemy import Column, BigInteger, DateTime, func

from database.models import Base


class SupportThread(Base):
    __tablename__ = 'support_threads'

    id = Column(BigInteger, primary_key=True)
    user_id = Column(BigInteger, unique=True)

    thread_id = Column(BigInteger, unique=True)
    created_at = Column(DateTime, default=func.now())
