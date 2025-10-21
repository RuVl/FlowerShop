from sqlalchemy import Column, BigInteger, String, DateTime, func

from database.models import Base


class UserActionLog(Base):
    __tablename__ = 'user_action_logs'

    id = Column(BigInteger, primary_key=True)

    user_id = Column(BigInteger)
    phone_number = Column(String, nullable=True)

    action = Column(String, nullable=False)  # Например: "enter_bot", "submit_phone", "open_miniapp", "add_to_cart", "payment"
    data = Column(String, nullable=True)  # JSON/dict для дополнительных деталей
    timestamp = Column(DateTime, default=func.now())
