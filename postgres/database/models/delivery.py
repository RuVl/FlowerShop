from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from database.models import Base


class Delivery(Base):
    __tablename__ = 'deliveries'

    id = Column(BigInteger, primary_key=True)
    order_id = Column(BigInteger, ForeignKey('orders.id'))

    delivery_date = Column(DateTime)
    status = Column(String, default='scheduled')  # "scheduled", "delivered", "canceled"
    order = relationship("Order", back_populates="deliveries", foreign_keys=[order_id])
