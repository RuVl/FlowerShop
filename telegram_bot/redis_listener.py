import json

from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from pydantic import BaseModel, ValidationError, field_validator
from redis.asyncio import Redis
from structlog.typing import FilteringBoundLogger

from env import RedisKeys


class NotificationRequest(BaseModel):
    user_id: int
    text: str
    media_type: str = "none"
    media_url: str | None = None
    button_title: str | None = None
    button_url: str | None = None

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, value):
        valid_types = ["none", "photo", "video"]
        if value not in valid_types:
            raise ValueError(f"media_type must be one of {valid_types}")
        return value


async def redis_listener(bot: Bot, logger: FilteringBoundLogger):
    redis = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
    pubsub = redis.pubsub()
    await pubsub.subscribe(RedisKeys.NOTIFICATION_CHANNEL)
    await logger.ainfo(f"Subscribed to Redis channel {RedisKeys.NOTIFICATION_CHANNEL}")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            try:
                data = json.loads(message["data"])
                notification = NotificationRequest(**data)
            except (json.JSONDecodeError, ValidationError) as e:
                await logger.aerror(f"Invalid notification data: {e}")
                continue

            keyboard = None
            if notification.button_title and notification.button_url:
                keyboard = InlineKeyboardMarkup(
                    inline_keyboard=[
                        [InlineKeyboardButton(text=notification.button_title, url=notification.button_url)]
                    ]
                )

            try:
                if notification.media_type == "photo" and notification.media_url:
                    await bot.send_photo(
                        chat_id=notification.user_id,
                        photo=notification.media_url,
                        caption=notification.text,
                        reply_markup=keyboard,
                        parse_mode=ParseMode.HTML
                    )
                elif notification.media_type == "video" and notification.media_url:
                    await bot.send_video(
                        chat_id=notification.user_id,
                        video=notification.media_url,
                        caption=notification.text,
                        reply_markup=keyboard,
                        parse_mode=ParseMode.HTML
                    )
                else:
                    await bot.send_message(
                        chat_id=notification.user_id,
                        text=notification.text,
                        reply_markup=keyboard,
                        parse_mode=ParseMode.HTML
                    )
                await logger.ainfo(f"Sent notification to user {notification.user_id}")
            except Exception as e:
                await logger.aerror(f"Failed to send notification to {notification.user_id}: {e}")
                # Можно добавить логику повторной попытки или сохранения неудавшихся сообщений
    finally:
        await pubsub.unsubscribe(RedisKeys.NOTIFICATION_CHANNEL)
        await redis.close()
        await logger.ainfo("Redis listener stopped and connection closed")
