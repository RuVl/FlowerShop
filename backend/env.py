from os import environ
from typing import Final


class ServerKeys:
    DEBUG: Final[bool] = bool(environ.get("DEBUG", default=False))
    JWT_SECRET_KEY: Final[str] = environ.get('JWT_SECRET_KEY')  # Bot token


class YookassaKeys:
    SHOP_ID: Final[str] = environ.get('YOOKASSA_SHOP_ID')
    SECRET_KEY: Final[str] = environ.get('YOOKASSA_SECRET_KEY')


# noinspection DuplicatedCode
class RedisKeys:
    HOST: Final[str] = environ.get('DOCKER_REDIS_HOST', default='localhost')
    PORT: Final[str] = environ.get('DOCKER_REDIS_PORT', default='6379')
    DATABASE: Final[str] = environ.get('REDIS_DB', default='0')

    URL: Final[str] = f'redis://{HOST}:{PORT}/{DATABASE}'
    NOTIFICATION_CHANNEL: Final[str] = environ.get('NOTIFICATION_CHANNEL', default='notifications')
