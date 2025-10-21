import logging

import aiohttp
from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from core.fsm import DepositState
from env import ServerKeys
from fluent.runtime import FluentLocalization
from structlog.typing import FilteringBoundLogger

logger = logging.getLogger(__name__)
deposit_router = Router()


@deposit_router.message(DepositState.awaiting_amount)
async def handle_deposit_amount(message: Message, state: FSMContext, l10n: FluentLocalization, logger: FilteringBoundLogger):
    data = await state.get_data()
    target_user_id = data.get("target_user_id")
    if not target_user_id:
        await state.clear()
        return

    text = message.text.strip().replace(",", ".")
    try:
        amount = float(text)
    except ValueError:
        await message.answer(l10n.format_value('deposit-amount-error'))
        return

    if amount < 100 or amount > 30000:
        await message.answer(l10n.format_value('deposit-amount-range-error'))
        return

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                    f"{ServerKeys.API_URL}/api/deposit_pay",
                    json={
                        "user_id": target_user_id,
                        "amount": amount,
                        "return_url": f"https://t.me/{(await message.bot.get_me()).username}"
                    }
            ) as resp:
                if resp.status != 200:
                    await message.answer(l10n.format_value('deposit-payment-error'))
                    await state.clear()
                    return
                data = await resp.json()
                confirmation_url = data.get("confirmation_url")
                pay_keyboard = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text=f"Оплатить {amount}₽", url=confirmation_url)]
                ])
                await message.answer(
                    l10n.format_value('deposit-payment-prompt', {"user_id": target_user_id, "amount": amount}),
                    reply_markup=pay_keyboard
                )
    except Exception as e:
        logger.error(f"Error in deposit: {e}")
        await message.answer(l10n.format_value('deposit-payment-error'))
    await state.clear()


@deposit_router.callback_query(F.data.startswith("deposit_pay_"))
async def handle_deposit_pay_callback(callback_query: CallbackQuery):
    await callback_query.answer()
