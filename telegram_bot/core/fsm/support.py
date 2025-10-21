from aiogram.fsm.state import State, StatesGroup


class SupportState(StatesGroup):
    awaiting_question = State()
