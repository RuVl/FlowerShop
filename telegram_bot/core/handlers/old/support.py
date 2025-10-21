from typing import Optional

from aiogram import Bot, Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, CallbackQuery
from fluent.runtime import FluentLocalization
from sqlalchemy import select
from structlog.typing import FilteringBoundLogger

from core.fsm import SupportState
from database import async_session
from database.models import SupportThread
from env import TelegramKeys
from utils.escape import escape_md_v2

support_router = Router()


async def _get_thread_by_user(session, user_id: int) -> Optional[SupportThread]:
    query = select(SupportThread).where(SupportThread.user_id == user_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def _get_thread_by_thread_id(session, thread_id: int) -> Optional[SupportThread]:
    query = select(SupportThread).where(SupportThread.thread_id == thread_id)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def create_support_topic_if_missing(bot: Bot, user_id: int, logger: FilteringBoundLogger) -> int:
    """
    Вернёт message_thread_id (int). Если уже есть — вернёт существующий.
    Использует bot.create_forum_topic для создания топика в Support group.
    """
    async with async_session() as session:
        thread = await _get_thread_by_user(session, user_id)
        if thread:
            return thread.thread_id  # уже есть

    # Не нашли — создаём топик в чате (forum topic). Имя аккуратно с user id.
    topic_title = f"Вопрос от user_id {user_id}"
    try:
        # aiogram Bot имеет метод create_forum_topic
        resp = await bot.create_forum_topic(chat_id=TelegramKeys.SUPPORT_CHAT_ID, name=topic_title)
        # resp это объект Message или Topic (зависит от aiogram), но поле message_thread_id должно быть в result
        # На всякий случай пытаемся достать message_thread_id
        thread_id = getattr(resp, "message_thread_id", None)
        # Если resp — object with 'message_thread_id' nested, но aiogram обычно возвращает Message with field.
        if thread_id is None:
            # иногда create_forum_topic возвращает Bot API response differently; try attr 'message' or similar
            # если не получилось — выбрасываем
            raise RuntimeError("Не удалось получить message_thread_id после create_forum_topic")
    except Exception:
        await logger.aexception("Ошибка при создании топика поддержки")
        raise

    # Сохраняем связку в БД
    async with async_session() as session:
        thread = SupportThread(user_id=user_id, thread_id=thread_id)
        session.add(thread)
        await session.commit()

    return thread_id


async def send_to_support_group(bot: Bot, user_id: int, text: str, logger: FilteringBoundLogger) -> None:
    """
    Отправляет текст в тему поддержки (создаёт её при необходимости).
    """
    try:
        thread_id = await create_support_topic_if_missing(bot, user_id, logger)
    except Exception:
        # Если не получилось создать топик — логируем и сообщаем пользователю (выше по коду уже должен быть ответ)
        await logger.aexception("Не удалось создать тему поддержки для user %s", user_id)
        raise

    # Отправляем сообщение в группу в нужную тему
    try:
        await bot.send_message(
            chat_id=TelegramKeys.SUPPORT_CHAT_ID,
            text=escape_md_v2(f"Пользователь {user_id}:\n\n{text}"),
            message_thread_id=thread_id,
            parse_mode="Markdown",
        )
    except Exception:
        await logger.aexception("Не удалось отправить сообщение в группу поддержки для user %s", user_id)
        raise


async def forward_admin_reply_to_user(bot: Bot, thread_id: int, admin_text: str, logger: FilteringBoundLogger) -> Optional[int]:
    """
    Находит связанный user_id по thread_id и отправляет туда сообщение.
    Возвращает user_id, если отправлено успешно, либо None.
    """
    async with async_session() as session:
        thread = await _get_thread_by_thread_id(session, thread_id)
        if not thread:
            await logger.aerror("Нет топика в БД для thread_id %s", thread_id)
            return None
        user_id = thread.user_id

    try:
        await bot.send_message(
            chat_id=user_id,
            text=escape_md_v2(f"Ответ администратора:\n\n{admin_text}")
        )
        return user_id
    except Exception:
        await logger.aexception("Не удалось отправить ответ пользователю %s из thread %s", user_id, thread_id)
        return None


# -----------------------
# Handlers
# -----------------------


@support_router.callback_query(F.data == "support")
async def handle_support_callback(callback_query: CallbackQuery, state: FSMContext, l10n: FluentLocalization):
    await handle_support_cmd(callback_query.message, state, l10n)
    await callback_query.answer()


@support_router.message(Command('support'))
async def handle_support_cmd(message: Message, state: FSMContext, l10n: FluentLocalization):
    await message.answer(l10n.format_value("support-prompt"))
    await state.set_state(SupportState.awaiting_question)


@support_router.message(SupportState.awaiting_question)
async def handle_support_question(message: Message, state: FSMContext, bot: Bot, l10n: FluentLocalization, logger: FilteringBoundLogger):
    """
    Пользователь прислал вопрос — сохраняем состояние, отправляем в группу поддержки.
    """
    user_id = message.from_user.id
    question_text = message.text or ""

    # очистим состояние (мы получили ответ)
    await state.clear()

    # подтверждение пользователю
    await message.answer(l10n.format_value("support-response"))

    # отправляем в группу (создадим тему если нужно) — используем единый bot
    try:
        await send_to_support_group(bot, user_id, question_text, logger)
        await logger.ainfo("Support question from user %s delivered to admin", user_id)
    except Exception:
        # сообщаем пользователю, что произошла ошибка и логируем
        await message.answer(l10n.format_value("support-error") if l10n else "Произошла ошибка при отправке вопроса в поддержку.")
        await logger.aexception("Failed to forward user %s question to support group", user_id)


@support_router.message(F.chat.id == TelegramKeys.SUPPORT_CHAT_ID, F.message_thread_id, F.text)
async def admin_message_in_topic(message: Message, bot: Bot, logger: FilteringBoundLogger):
    """
    Обрабатываем сообщения в группе поддержки внутри темы (forum topic).
    Если админ отвечает в теме — отправляем это сообщение пользователю, чей топик это был.
    """
    # Игнорируем сообщения от ботов (включая самого себя), чтобы избежать loop'ов.
    if message.from_user and message.from_user.is_bot:
        return

    # message.message_thread_id содержит id темы
    thread_id = message.message_thread_id
    if thread_id is None:
        # не та ветка
        return

    # Если сообщение — служебное (например, бот изменил что-то) — игнорируем
    if not message.text:
        return

    # Пересылаем ответ пользователю
    user_id = None
    try:
        user_id = await forward_admin_reply_to_user(bot, thread_id, message.text, logger)
    except Exception:
        await logger.aexception("Error forwarding admin reply in thread %s", thread_id)
        # опционально — отвечаем в теме о неуспехе отправки
        await message.reply("Ошибка при отправке ответа пользователю\. Посмотрите логи\.")

    if user_id:
        await message.reply("Ответ отправлен пользователю\.")
