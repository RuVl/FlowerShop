from sqlalchemy import Column, BigInteger, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.types import DECIMAL

from database.models import Base





class CartItem(Base):
    __tablename__ = 'cart_items'

    id = Column(BigInteger, primary_key=True)

    user_id = Column(BigInteger, ForeignKey('users.user_id'))
    item_id = Column(String)

    quantity = Column(Integer, default=1)
    price = Column(DECIMAL(precision=10, scale=2))
    type = Column(String)

    deliveriesPerMonth = Column(Integer, default=1)  # <-- добавить!
    subscriptionMonths = Column(Integer, default=1)  # <-- добавить!

    title = Column(String, default="")  # <-- добавить!
    photos = Column(String, default="[]")  # <-- добавить!

    user = relationship("User", back_populates="cart_items", foreign_keys=[user_id])
