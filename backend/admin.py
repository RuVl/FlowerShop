import logging
from datetime import timedelta, datetime

import jwt
from fastapi import Body, APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jwt import InvalidTokenError
from pydantic import BaseModel
from sqlalchemy import select
from starlette import status

from database import async_session
from database.models import Admin
from env import ServerKeys

logger = logging.getLogger(__name__)

admin_router = APIRouter(prefix='/api/admin', tags=['admin'])


class AdminLogin(BaseModel):
    username: str
    password: str


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/login")  # Для зависимости


async def get_current_admin(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, ServerKeys.JWT_SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role != "admin":
            raise credentials_exception
        return {"username": username}  # Или полный admin объект, если нужно
    except InvalidTokenError:
        raise credentials_exception


@admin_router.post("/login")
async def admin_login(form_data: AdminLogin = Body(...)):
    async with async_session() as session:
        query = select(Admin).where(Admin.username == form_data.username)
        result = await session.execute(query)
        admin = result.scalar_one_or_none()

        if not admin or not admin.check_password(form_data.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not admin.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin is inactive")

        # Генерация JWT (аналогично вашему /api/auth, но с role)
        token_expires = timedelta(hours=24)
        token = jwt.encode({
            'sub': admin.username,  # Или admin.id
            'role': 'admin',
            'exp': datetime.now() + token_expires
        }, ServerKeys.JWT_SECRET_KEY, algorithm='HS256')

        return {"access_token": token, "token_type": "bearer"}
