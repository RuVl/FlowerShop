import argparse
import asyncio
import random
import string
from datetime import datetime

from sqlalchemy import select

from database import async_session
from database.models import Admin


def generate_password(length=32):
    """Генерирует случайный пароль из букв, цифр и символов."""
    characters = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(random.choice(characters) for _ in range(length))
    return password


async def create_admin(username: str, password: str | None, email: str):
    """Асинхронная функция для создания админа в базе данных."""
    async with async_session() as session:
        # Проверяем, существует ли админ с таким username или email
        query_username = select(Admin).where(Admin.username == username)
        result_username = await session.execute(query_username)
        if result_username.scalar_one_or_none():
            raise ValueError(f"Админ с username '{username}' уже существует.")

        query_email = select(Admin).where(Admin.email == email)
        result_email = await session.execute(query_email)
        if result_email.scalar_one_or_none():
            raise ValueError(f"Админ с email '{email}' уже существует.")

        # Если пароль не передан, генерируем его
        if password is None:
            password = generate_password()
            print(f"Сгенерированный пароль: {password}")

        # Хэшируем пароль
        admin = Admin(
            username=username,
            email=email,
            is_active=True,
            created_at=datetime.now()
        )
        admin.set_password(password)

        session.add(admin)
        await session.commit()
        await session.refresh(admin)

        print(f"Админ успешно создан: ID={admin.id}, Username={admin.username}, Email={admin.email}")
        return admin


def main():
    """Основная функция для парсинга аргументов и запуска создания админа."""
    parser = argparse.ArgumentParser(
        description="Скрипт для создания админа в базе данных. Поддерживает генерацию пароля, если он не указан."
    )
    parser.add_argument("-U", "--username", type=str, help="Логин (username) админа")
    parser.add_argument("-E", "--email", type=str, help="Email админа")
    parser.add_argument("-P", "--password", type=str, default=None, help="Пароль админа (если не указан, будет сгенерирован)")

    args = parser.parse_args()

    try:
        asyncio.run(create_admin(args.username, args.password, args.email))
    except ValueError as e:
        print(f"Ошибка: {e}")


if __name__ == "__main__":
    main()
