from os import environ
from typing import Final


class TelegramKeys:
    DEBUG: Final[bool] = bool(environ.get('DEBUG', default=False))
    API_TOKEN: Final[str] = environ.get('TG_API_TOKEN')

    SUPPORT_CHAT_ID: Final[int] = int(environ.get('SUPPORT_CHAT_ID', default=0))
    ADMIN_CHAT_ID: Final[int] = int(environ.get('ADMIN_CHAT_ID', default=0))


class ServerKeys:
    API_URL: Final[str] = environ.get('API_URL')
    WEB_APP_URL: Final[str] = environ.get('WEB_APP_URL')


# noinspection DuplicatedCode
class RedisKeys:
    HOST: Final[str] = environ.get('DOCKER_REDIS_HOST', default='localhost')
    PORT: Final[str] = environ.get('DOCKER_REDIS_PORT', default='6379')
    DATABASE: Final[str] = environ.get('REDIS_DB', default='0')

    URL: Final[str] = f'redis://{HOST}:{PORT}/{DATABASE}'
    NOTIFICATION_CHANNEL: Final[str] = environ.get('NOTIFICATION_CHANNEL', default='notifications')


class LoggerKeys:
    SHOW_DEBUG_LOGS: Final[bool] = bool(environ.get('LOGGER_SHOW_DEBUG_LOGS', default=False))

    SHOW_DATETIME: Final[bool] = bool(environ.get('LOGGER_SHOW_DATETIME', default=False))
    DATETIME_FORMAT: Final[str] = environ.get('LOGGER_DATETIME_FORMAT', default='%Y-%m-%d %H:%M:%S')
    TIME_IN_UTC: Final[bool] = bool(environ.get('LOGGER_TIME_IN_UTC', default=False))

    USE_COLORS_IN_CONSOLE: Final[bool] = bool(environ.get('LOGGER_USE_COLORS_IN_CONSOLE', default=False))

    # File logging configuration
    LOG_TO_FILE: Final[bool] = bool(environ.get('LOGGER_LOG_TO_FILE', default=True))
    LOG_FILE_PATH: Final[str] = environ.get('LOGGER_LOG_FILE_PATH', default='logs/bot.log')
    LOG_FILE_MAX_SIZE: Final[int] = int(environ.get('LOGGER_LOG_FILE_MAX_SIZE', default=10 * 1024 * 1024))  # 10 MB
    LOG_FILE_BACKUP_COUNT: Final[int] = int(environ.get('LOGGER_LOG_FILE_BACKUP_COUNT', default=5))  # Keep 5 backup files
