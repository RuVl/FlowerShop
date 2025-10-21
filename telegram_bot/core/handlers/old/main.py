from aiogram import Router

from core.handlers.old.admin import admin_router
from core.handlers.old.deposit import deposit_router
from core.handlers.old.start import start_router
from core.handlers.old.support import support_router

old_router = Router()
old_router.include_routers(
    start_router,
    deposit_router,
    support_router,
    admin_router
)
