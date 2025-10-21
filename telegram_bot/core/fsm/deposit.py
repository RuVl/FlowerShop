from aiogram.fsm.state import State, StatesGroup


class DepositState(StatesGroup):
    awaiting_amount = State()
