import asyncio

import structlog
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand
from structlog.typing import FilteringBoundLogger

from core.handlers import register_handlers
from core.includes.logging import setup_logging
from core.includes.storage import get_storage
from core.middlewares import register_middlewares
from env import TelegramKeys
from redis_listener import redis_listener


async def run_bot():
    # Init logging
    setup_logging()

    # Init bot
    bot = Bot(
        token=TelegramKeys.API_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN_V2)
    )
    await bot.set_my_commands([
        BotCommand(command='start', description='Запустить бота'),
        BotCommand(command='support', description='Поддержка'),
    ])

    # Get storage with proper configuration for dialogs
    storage = get_storage(with_destiny=True)

    # Init dispatcher
    dp = Dispatcher(storage=storage)

    # Register handlers and middlewares
    register_handlers(dp)
    register_middlewares(dp)

    # Start bot
    logger: FilteringBoundLogger = structlog.get_logger()
    await logger.ainfo("Starting the bot...")

    try:
        asyncio.create_task(redis_listener(bot, logger))
        await dp.start_polling(
            bot,
            skip_updates=TelegramKeys.DEBUG,  # skip updates if debug
            allowed_updates=dp.resolve_used_update_types()  # Get only registered updates
        )
    finally:
        await bot.session.close()
        await logger.ainfo("Bot stopped.")
