from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from env import ServerKeys
from fluent.runtime import FluentLocalization


def get_main_menu(l10n: FluentLocalization) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=l10n.format_value('open-mini-app-btn'), web_app=WebAppInfo(url=ServerKeys.WEB_APP_URL))],
            [InlineKeyboardButton(text=l10n.format_value('call-support-btn'), callback_data="support")],
        ]
    )


def get_back_button(l10n: FluentLocalization) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=l10n.format_value('go-back-btn'), callback_data="back")]])
