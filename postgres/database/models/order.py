from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.types import DECIMAL

from database.models import Base, Delivery


class Order(Base):
    __tablename__ = 'orders'

    id = Column(BigInteger, primary_key=True)

    user_id = Column(BigInteger, ForeignKey('users.user_id'))
    status = Column(String, default='pending')
    total_amount = Column(DECIMAL(precision=10, scale=2))

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    items = Column(String, nullable=True)
    order_type = Column(String, default='one-time')  # <-- добавлено!

    fio = Column(String, nullable=True)  # <-- Добавить
    phone = Column(String, nullable=True)  # <-- Добавить
    email = Column(String, nullable=True)  # <-- Добавить
    comment = Column(String, nullable=True)  # <-- Добавить

    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    transactions = relationship("Transaction", back_populates="order", foreign_keys="Transaction.order_id")

    deliveries = relationship("Delivery", back_populates="order", foreign_keys=[Delivery.order_id])
