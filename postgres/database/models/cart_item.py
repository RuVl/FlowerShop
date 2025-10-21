import enum
from datetime import datetime

from sqlalchemy import BigInteger, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship, mapped_column, Mapped
from sqlalchemy.types import DECIMAL

from database.models import Base, User
from database.utils import EnumByValues


@enum.verify(enum.NAMED_FLAGS)
class CartItemType(enum.StrEnum, boundary=enum.STRICT):
    ONE_TIME = "one-time"
    SUBSCRIPTION = "subscription"


class CartItem(Base):
    __tablename__ = 'cart_items'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey('users.user_id'))
    item_id: Mapped[str] = mapped_column(String)

    quantity: Mapped[int] = mapped_column(Integer, default=1)
    price: Mapped[int] = mapped_column(DECIMAL(precision=10, scale=2))
    type: Mapped[CartItemType] = mapped_column(EnumByValues(CartItemType), default=CartItemType.ONE_TIME)

    # for one-time
    deliveryDate: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # for subscription
    deliveriesPerMonth: Mapped[int] = mapped_column(Integer, default=1, nullable=True)  # <-- добавить!
    subscriptionMonths: Mapped[int] = mapped_column(Integer, default=1, nullable=True)  # <-- добавить!

    title: Mapped[str] = mapped_column(String, default="")  # <-- добавить!
    photos: Mapped[str] = mapped_column(String, default="[]")  # <-- добавить!

    user: Mapped['User'] = relationship("User", back_populates="cart_items", foreign_keys=[user_id])
