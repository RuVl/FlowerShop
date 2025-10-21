from aiogram import Dispatcher

from core.includes.fluent import get_fluent_localization
from core.middlewares import L10nMw, LoggingMw

L10N_FORMAT_KEY = "l10n"
LOGGING_KEY = "logger"


def register_middlewares(dp: Dispatcher):
    # Localization
    locale = get_fluent_localization()
    l10n_mw = L10nMw(locale, L10N_FORMAT_KEY)
    dp.message.outer_middleware(l10n_mw)
    dp.callback_query.outer_middleware(l10n_mw)

    # Logging (should be last)
    logging_mw = LoggingMw(LOGGING_KEY)
    dp.message.middleware(logging_mw)
    dp.callback_query.middleware(logging_mw)
