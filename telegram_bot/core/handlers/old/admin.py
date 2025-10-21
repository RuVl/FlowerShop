from aiogram import Router, F
from aiogram.types import Message
from fluent.runtime import FluentLocalization
from structlog.typing import FilteringBoundLogger

from env import TelegramKeys

admin_router = Router()


@admin_router.message(F.chat.id == TelegramKeys.ADMIN_CHAT_ID)
async def handle_admin_reply_any(message: Message, l10n: FluentLocalization, logger: FilteringBoundLogger):
    if message.reply_to_message:
        reply_text = message.reply_to_message.text
        if reply_text and "Новый вопрос от пользователя" in reply_text:
            try:
                user_id = int(reply_text.split("от пользователя")[1].split(":")[0].strip())
            except ValueError:
                await message.reply(l10n.format_value('admin-old-id-error'))
                return
            await message.bot.send_message(user_id, f"Ответ администратора по вашему вопросу:\n{message.text}")
            await message.reply(l10n.format_value('admin-reply-sent', {'user_id': user_id}))
            logger.info(f"Admin reply sent to old {user_id}: {message.text}")
            return

    if message.text.startswith("/done"):
        parts = message.text.split()
        if len(parts) == 2 and parts[1].isdigit():
            user_id = int(parts[1])
            await message.reply(l10n.format_value('admin-dialog-done', {'user_id': user_id}))
            logger.info(f"Admin finished dialog with old {user_id}")
        else:
            await message.reply(l10n.format_value('admin-done-usage'))
        return

    await message.reply(l10n.format_value('admin-reply-instruction'))
