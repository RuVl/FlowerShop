from sqlalchemy import Column, BigInteger, String, DateTime, func, DECIMAL, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship

from database.models import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True)

    user_id = Column(BigInteger, unique=True)
    username = Column(String, nullable=True)
    phone_number = Column(String)
    avatar = Column(String, nullable=True)
    join_time = Column(DateTime, default=func.now())
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    deposit_link = Column(String, nullable=True)
    qr_code = Column(String, nullable=True)
    balance = Column(DECIMAL(precision=10, scale=2), default=0.00)

    daily_launches = Column(Integer, default=0)
    total_launches = Column(Integer, default=0)

    active_order_id = Column(BigInteger, ForeignKey('orders.id'), nullable=True)

    blocked = Column(Boolean, default=False)

    transactions = relationship("Transaction", back_populates="user", foreign_keys="Transaction.user_id")
    cart_items = relationship("CartItem", back_populates="user", foreign_keys="CartItem.user_id")
    orders = relationship("Order", back_populates="user", foreign_keys="Order.user_id")

    source_param = Column(String, nullable=True)  # Добавь это поле
