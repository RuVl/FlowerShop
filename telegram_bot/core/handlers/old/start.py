import aiohttp
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from aiogram.utils.deep_linking import create_start_link
from fluent.runtime import FluentLocalization
from sqlalchemy import select
from structlog.typing import FilteringBoundLogger

from core.fsm import DepositState
from core.keyboards.inline import get_main_menu
from core.keyboards.reply import get_contact_button
from database import async_session
from database.models import User
from env import ServerKeys

start_router = Router()


@start_router.message(CommandStart())
async def start_command(message: Message, state: FSMContext, l10n: FluentLocalization, logger: FilteringBoundLogger):
    bot = message.bot
    chat_id = message.chat.id
    user_id = message.from_user.id
    user_username = message.from_user.username
    start_arg = message.text.split(" ", 1)[1] if len(message.text.split()) > 1 else None

    if start_arg and start_arg.startswith("deposit_"):
        target_user_id = int(start_arg.replace("deposit_", ""))
        if target_user_id == user_id:
            await message.answer(l10n.format_value('deposit-self-error'))
            return
        async with async_session() as session:
            query = select(User).where(User.user_id == target_user_id)
            result = await session.execute(query)
            target_user = result.scalar_one_or_none()
            display = f"@{target_user.username}" if target_user and target_user.username else str(target_user_id)
        await state.set_state(DepositState.awaiting_amount)
        await state.set_data({"target_user_id": target_user_id})
        await message.answer(l10n.format_value('deposit-amount-prompt', {'old': display}))
        return

    # Log enter_bot
    try:
        async with aiohttp.ClientSession() as session_http:
            await session_http.post(
                f"{ServerKeys.API_URL}/user_action",
                json={
                    "user_id": user_id,
                    "phone_number": None,
                    "action": "enter_bot",
                    "data": {"username": user_username, "start_param": start_arg}
                }
            )
    except Exception as e:
        logger.error(f"Failed to log enter_bot: {e}")

    async with async_session() as session:
        query = select(User).where(User.user_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        try:
            if user:
                user.username = user_username
                if start_arg and not user.source_param:
                    user.source_param = start_arg
                await session.commit()
                await bot.send_message(
                    chat_id,
                    l10n.format_value('greeting'),
                    reply_markup=get_main_menu(l10n),
                )
            else:
                await message.answer(l10n.format_value('share-phone'), reply_markup=get_contact_button(l10n))
            await logger.ainfo(f"Processed /start for {user_id}")
        except Exception as e:
            await logger.aerror(f"Error in /start for {user_id}: {e}")
            await message.answer(l10n.format_value('error'), reply_markup=get_contact_button(l10n))


@start_router.message(F.contact)
async def handle_contact(message: Message, l10n: FluentLocalization, logger: FilteringBoundLogger):
    bot = message.bot
    contact = message.contact
    user_id = message.from_user.id
    phone_number = contact.phone_number
    chat_id = message.chat.id
    user_username = message.from_user.username
    await logger.ainfo(f"Received contact from {user_id}: {phone_number}")

    # Create the link and qr-code
    deposit_link = await create_start_link(bot=bot, payload=f'deposit_{user_id}')
    # qr_code = segno.make(deposit_link, micro=False)

    async with async_session() as session:
        query = select(User).where(User.user_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                user_id=user_id,
                phone_number=phone_number,
                deposit_link=deposit_link,
                username=user_username,
            )
            session.add(user)
        else:
            user.phone_number = phone_number
            user.deposit_link = deposit_link
            user.username = user_username
        await session.commit()

    await logger.ainfo(f"Saved/updated {user_id} in database")

    await bot.send_message(
        chat_id,
        l10n.format_value('greeting'),
        reply_markup=get_main_menu(l10n),
    )

    async with aiohttp.ClientSession() as session:
        await session.post(
            f"{ServerKeys.API_URL}/user_action",
            json={
                "user_id": user_id,
                "phone_number": phone_number,
                "action": "submit_phone",
                "data": {"username": user_username}
            }
        )

    await message.delete()
