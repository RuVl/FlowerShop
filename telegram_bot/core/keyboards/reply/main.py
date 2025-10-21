from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from fluent.runtime import FluentLocalization


def get_contact_button(l10n: FluentLocalization) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=l10n.format_value('send-phone-number-btn'), request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
