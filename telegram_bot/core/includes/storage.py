from datetime import timedelta

from aiogram.fsm.storage.base import BaseStorage
from aiogram.fsm.storage.redis import DefaultKeyBuilder, RedisStorage
from redis.asyncio import Redis

from env import RedisKeys


def get_storage(
        *,
        state_ttl: timedelta | int | None = None,
        data_ttl: timedelta | int | None = None,
        key_builder_prefix: str = 'fsm',
        key_builder_separator: str = ':',
        key_builder_with_bot_id: bool = False,
        key_builder_with_destiny: bool = False,
        with_destiny: bool = False,
) -> BaseStorage:
    return RedisStorage(
        Redis.from_url(RedisKeys.URL),
        key_builder=DefaultKeyBuilder(
            prefix=key_builder_prefix,
            separator=key_builder_separator,
            with_bot_id=key_builder_with_bot_id,
            with_destiny=key_builder_with_destiny or with_destiny
        ),
        state_ttl=state_ttl,
        data_ttl=data_ttl,
    )


def get_redis(**kwargs) -> Redis:
    return Redis.from_url(RedisKeys.URL, **kwargs)
