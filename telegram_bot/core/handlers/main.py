from aiogram import Dispatcher

from core.handlers.old import old_router


def register_handlers(dp: Dispatcher):
    dp.include_routers(
        old_router
    )
