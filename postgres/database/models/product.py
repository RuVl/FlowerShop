from sqlalchemy import Column, BigInteger, String, Integer

from .base import Base


class Product(Base):
    __tablename__ = 'products'

    id = Column(BigInteger, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    photos = Column(String, nullable=True)
    price_per_delivery = Column(Integer, nullable=False)

    max_deliveries = Column(Integer, nullable=False)
    max_months = Column(Integer, nullable=False)

    type = Column(String, nullable=False)
    size = Column(String, nullable=True)  # S, M, L
