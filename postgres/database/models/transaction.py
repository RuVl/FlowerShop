from sqlalchemy import Column, BigInteger, ForeignKey, DECIMAL, String, DateTime, func
from sqlalchemy.orm import relationship

from .base import Base


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(BigInteger, primary_key=True)

    user_id = Column(BigInteger, ForeignKey('users.user_id'))
    order_id = Column(BigInteger, ForeignKey('orders.id'), nullable=True)  # <-- Связь с заказом!

    amount = Column(DECIMAL(precision=10, scale=2))
    status = Column(String, default="pending")

    payment_id = Column(String, unique=True)
    transaction_type = Column(String)

    timestamp = Column(DateTime, default=func.now())
    description = Column(String, nullable=True)

    user = relationship("User", back_populates="transactions", foreign_keys=[user_id])
    order = relationship("Order", back_populates="transactions", foreign_keys=[order_id])
