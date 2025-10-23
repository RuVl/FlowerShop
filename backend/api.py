import hashlib
import hmac
import json
import logging
import re
import urllib
from datetime import datetime, timedelta
from decimal import Decimal
from operator import itemgetter
from typing import Optional, Any, List
from urllib.parse import unquote

import jwt
from fastapi import FastAPI, HTTPException, Body, Request, Security
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from redis.asyncio import Redis
from sqlalchemy import select, delete
from starlette.responses import JSONResponse
from yookassa import Payment, Configuration

from admin import admin_router, get_current_admin
from database import async_session
from database.models import User, Product, Order, CartItem, Transaction, Delivery, UserActionLog, Source, SourceVisit
from database.models.cart_item import CartItemType
from env import ServerKeys, YookassaKeys, RedisKeys

logger = logging.getLogger(__name__)

app = FastAPI()
app.include_router(admin_router)

# --- настройки ЮКасса ---
Configuration.account_id = YookassaKeys.SHOP_ID
Configuration.secret_key = YookassaKeys.SECRET_KEY

# Разрешаем CORS для фронта
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if ServerKeys.DEBUG:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        # Формируем строку с деталями ошибки для лога
        exc_str = f"{exc}".replace("\n", " ").replace("    ", " ")

        # Логируем: URL, метод, body и детали ошибки
        logger.error(
            f"Validation error for {request.method} {request.url}: {exc_str}. "
            f"Received body: {jsonable_encoder(request.body) if request.body else 'None'}"
        )

        # Стандартный ответ клиенту (можно кастомизировать)
        return JSONResponse(
            status_code=422,
            content=jsonable_encoder({
                "detail": exc.errors(),  # Список ошибок (loc, msg, type и т.д.)
                "body": exc.body,  # Полученный body для отладки
            }),
        )


@app.post("/")
async def catch_root_webhook(request: Request):
    try:
        # noinspection DuplicatedCode
        payload = await request.json()
        logger.info(f"[Root Webhook] Получен запрос на /:")
        logger.info(f"[Root Webhook] Метод: {request.method}")
        logger.info(f"[Root Webhook] URL: {request.url}")
        logger.info(f"[Root Webhook] IP клиента: {request.client.host}")
        logger.info(f"[Root Webhook] Заголовки: {dict(request.headers)}")
        logger.info(f"[Root Webhook] Payload: {json.dumps(payload, ensure_ascii=False)}")
    except Exception as e:
        logger.info(f"[Root Webhook] Ошибка обработки: {str(e)}")
    raise HTTPException(
        status_code=400,
        detail="Неверный URL вебхука. Используйте /api/yookassa/webhook для ЮKassa вебхуков."
    )


class BroadcastRequest(BaseModel):
    message: str
    user_id: Optional[int] = None  # если None, значит всем
    all_users: Optional[bool] = False
    media_type: Optional[str] = "none"  # "none" | "photo" | "video"
    media_url: Optional[str] = None
    button_title: Optional[str] = None
    button_url: Optional[str] = None


class NotificationRequest(BaseModel):
    user_id: int
    text: str
    media_type: str = "none"
    media_url: str | None = None
    button_title: str | None = None
    button_url: str | None = None

    @field_validator("media_type")
    @classmethod
    def validate_media_type(cls, value):
        valid_types = ["none", "photo", "video"]
        if value not in valid_types:
            raise ValueError(f"media_type must be one of {valid_types}")
        return value


@app.post("/api/broadcast")
async def broadcast_api(data: BroadcastRequest = Body(...), _: dict = Security(get_current_admin)):
    async with async_session() as session:
        # Проверка входных данных
        if not data.message or (data.user_id is None and not data.all_users):
            raise HTTPException(status_code=400, detail="Недостаточно данных для рассылки")

        # Инициализация Redis
        redis = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)

        try:
            if data.all_users:
                # Получаем всех активных пользователей
                query = select(User).filter_by(blocked=False)
                result = await session.execute(query)
                users = result.scalars().all()
                if not users:
                    raise HTTPException(status_code=404, detail="Активные пользователи не найдены")

                # Публикуем уведомления для каждого пользователя в Redis
                sent_count = 0
                for user in users:
                    notification = NotificationRequest(
                        user_id=user.user_id,
                        text=data.message,
                        media_type=data.media_type or "none",
                        media_url=data.media_url,
                        button_title=data.button_title,
                        button_url=data.button_url
                    )
                    await redis.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification.model_dump(mode='json')))
                    sent_count += 1

                return {"sent": sent_count, "total": len(users)}
            else:
                # Проверяем одного пользователя
                query = select(User).filter_by(user_id=data.user_id, blocked=False)
                result = await session.execute(query)
                user = result.scalar_one_or_none()
                if not user:
                    raise HTTPException(status_code=404, detail="Пользователь не найден или заблокирован")

                # Публикуем уведомление в Redis
                notification = NotificationRequest(
                    user_id=data.user_id,
                    text=data.message,
                    media_type=data.media_type or "none",
                    media_url=data.media_url,
                    button_title=data.button_title,
                    button_url=data.button_url
                )
                await redis.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification.model_dump(mode='json')))
                return {"sent": 1, "user_id": data.user_id}

        finally:
            await redis.close()


class AuthData(BaseModel):
    initData: str


async def verify_init_data(init_data: str) -> dict:
    try:
        parsed_data = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid query string")
    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Hash not present in init_data")
    received_hash = parsed_data.pop('hash')
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed_data.items(), key=itemgetter(0))
    )
    secret_key = hmac.new(
        key=b"WebAppData", msg=ServerKeys.TG_API_TOKEN.encode(), digestmod=hashlib.sha256
    )
    computed_hash = hmac.new(
        key=secret_key.digest(), msg=data_check_string.encode(), digestmod=hashlib.sha256
    ).hexdigest()
    if computed_hash != received_hash:
        raise HTTPException(status_code=401, detail="Invalid WebAppInitData")

    auth_date = int(parsed_data.get('auth_date', 0))
    if (datetime.now().timestamp() - auth_date) > 300 and not ServerKeys.DEBUG:
        raise HTTPException(status_code=401, detail="Expired WebAppInitData")
    user_field = parsed_data.get('user')
    if not user_field:
        raise HTTPException(status_code=400, detail="Missing or empty 'user' field in init_data")
    try:
        user_data = json.loads(user_field)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON in 'user' field: {str(e)}")
    if not isinstance(user_data, dict):
        raise HTTPException(status_code=400, detail="'user' field must be a valid JSON object")
    return user_data


# Public
@app.post("/api/auth")
async def auth(data: AuthData = Body(...)):
    try:
        user_data = await verify_init_data(data.initData)
        photo_url = user_data.get("photo_url")
        async with async_session() as session:
            query = select(User).where(User.user_id == user_data["id"])
            result = await session.execute(query)
            user = result.scalar_one_or_none()
            if user:
                user.avatar = photo_url
                if getattr(user, "blocked", False):
                    raise HTTPException(status_code=403, detail="Вы были заблокированы - обратитесь к администратору")
            else:
                user = User(
                    user_id=user_data["id"],
                    avatar=photo_url,
                    phone_number=user_data.get("phone_number"),
                    join_time=datetime.now(),
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                )
                session.add(user)
            await session.commit()
        token = jwt.encode({
            'user_id': user_data['id'],
            'exp': datetime.now() + timedelta(hours=24)
        }, ServerKeys.TG_API_TOKEN, algorithm='HS256')
        return {'token': token}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


# ----- CRUD для продуктов -----
class ProductIn(BaseModel):
    title: str
    description: Optional[str]
    photos: List[str] = []
    price_per_delivery: int
    max_deliveries: int
    max_months: int
    type: str
    size: Optional[str] = None


class ProductOut(ProductIn):
    id: int


# Public
@app.get("/products", response_model=List[ProductOut])
async def get_products():
    async with async_session() as session:
        query = select(Product)
        result = await session.execute(query)
        products = result.scalars().all()
        return [
            ProductOut(
                id=p.id,
                title=p.title,
                description=p.description,
                photos=json.loads(p.photos) if p.photos else [],
                price_per_delivery=p.price_per_delivery,
                max_deliveries=p.max_deliveries,
                max_months=p.max_months,
                type=p.type,
                size=p.size
            ) for p in products
        ]


@app.post("/products", response_model=ProductOut)
async def create_product(product: ProductIn, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        db_product = Product(
            title=product.title,
            description=product.description,
            photos=json.dumps(product.photos),
            price_per_delivery=product.price_per_delivery,
            max_deliveries=product.max_deliveries,
            max_months=product.max_months,
            type=product.type,
            size=product.size,
        )
        session.add(db_product)
        await session.commit()
        await session.refresh(db_product)
        return ProductOut(
            id=db_product.id,
            title=db_product.title,
            description=db_product.description,
            photos=product.photos,
            price_per_delivery=db_product.price_per_delivery,
            max_deliveries=db_product.max_deliveries,
            max_months=db_product.max_months,
            type=db_product.type,
            size=db_product.size,
        )


@app.put("/products/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, product: ProductIn, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Product).where(Product.id == product_id)
        result = await session.execute(query)
        db_product = result.scalar_one_or_none()
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        db_product.title = product.title
        db_product.description = product.description
        db_product.photos = json.dumps(product.photos)
        db_product.price_per_delivery = product.price_per_delivery
        db_product.max_deliveries = product.max_deliveries
        db_product.max_months = product.max_months
        db_product.type = product.type
        db_product.size = product.size
        await session.commit()
        await session.refresh(db_product)
        return ProductOut(
            id=db_product.id,
            title=db_product.title,
            description=db_product.description,
            photos=product.photos,
            price_per_delivery=db_product.price_per_delivery,
            max_deliveries=db_product.max_deliveries,
            max_months=db_product.max_months,
            type=db_product.type,
            size=db_product.size,
        )


@app.delete("/products/{product_id}")
async def delete_product(product_id: int, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Product).where(Product.id == product_id)
        result = await session.execute(query)
        db_product = result.scalar_one_or_none()
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        await session.delete(db_product)
        await session.commit()
        return {"ok": True}


# --------- CRUD для пользователей (для админки) ---------
class UserOut(BaseModel):
    id: int
    user_id: int
    avatar: Optional[str]
    phone_number: Optional[str]
    join_time: Optional[str]
    balance: float = 0
    daily_launches: int = 0
    total_launches: int = 0
    blocked: Optional[bool] = False
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    source_param: Optional[str] = None  # <-- добавь


class UserUpdate(BaseModel):
    phone_number: Optional[str]
    balance: Optional[float]
    blocked: Optional[bool]


class UserBlockRequest(BaseModel):
    blocked: bool


class UserBalanceRequest(BaseModel):
    balance: float


class DeliveryOut(BaseModel):
    id: int
    delivery_date: str
    status: str


class OrderOut(BaseModel):
    id: int
    user_id: int
    status: str
    total_amount: float
    created_at: str
    updated_at: Optional[str]
    items: Optional[list] = None
    order_type: str = "one-time"
    deliveries: List[DeliveryOut] = []
    fio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    comment: Optional[str] = None


class OrderFullOut(BaseModel):
    id: int
    user_id: Optional[int]
    phone_number: Optional[str]
    status: str
    total_amount: float
    created_at: str
    updated_at: Optional[str]
    items: Optional[list] = None
    order_type: str
    fio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    comment: Optional[str] = None


@app.get("/users", response_model=List[UserOut])
async def get_users(_: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User)
        result = await session.execute(query)
        users = result.scalars().all()
        return [
            UserOut(
                id=u.id,
                user_id=u.user_id,
                avatar=u.avatar,
                phone_number=u.phone_number,
                join_time=u.join_time.isoformat() if u.join_time else None,
                balance=float(u.balance or 0),
                daily_launches=u.daily_launches or 0,
                total_launches=u.total_launches or 0,
                blocked=getattr(u, "blocked", False),
                source_param=getattr(u, "source_param", None)
            ) for u in users
        ]


# Public
@app.get("/users/{user_id}", response_model=UserOut)
async def get_user(user_id: int):
    async with async_session() as session:
        query = select(User).where(User.user_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserOut(
            id=user.id,
            user_id=user.user_id,
            avatar=user.avatar,
            phone_number=user.phone_number,
            join_time=user.join_time.isoformat() if user.join_time else None,
            balance=float(user.balance or 0),
            daily_launches=user.daily_launches or 0,
            total_launches=user.total_launches or 0,
            blocked=getattr(user, "blocked", False),
            first_name=getattr(user, "first_name", None),
            last_name=getattr(user, "last_name", None),
            source_param=getattr(user, "source_param", None)
        )


@app.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: int, update: UserUpdate, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User).where(User.user_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if update.phone_number is not None:
            user.phone_number = update.phone_number
        if update.balance is not None:
            user.balance = Decimal(update.balance)
        if update.blocked is not None:
            user.blocked = update.blocked
        await session.commit()
        await session.refresh(user)
        return UserOut(
            id=user.id,
            user_id=user.user_id,
            avatar=user.avatar,
            phone_number=user.phone_number,
            join_time=user.join_time.isoformat() if user.join_time else None,
            balance=float(user.balance or 0),
            daily_launches=user.daily_launches or 0,
            total_launches=user.total_launches or 0,
            blocked=user.blocked,
            first_name=user.first_name,
            last_name=user.last_name,
            source_param=getattr(user, "source_param", None)
        )


@app.patch("/users/{user_id}/block", response_model=UserOut)
async def block_user(user_id: int, update: UserBlockRequest, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User).filter_by(user_id=user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.blocked = update.blocked
        await session.commit()
        await session.refresh(user)

        return UserOut(
            id=user.id,
            user_id=user.user_id,
            avatar=user.avatar,
            phone_number=user.phone_number,
            join_time=user.join_time.isoformat() if user.join_time else None,
            balance=float(user.balance or 0),
            daily_launches=user.daily_launches or 0,
            total_launches=user.total_launches or 0,
            blocked=getattr(user, "blocked", False)
        )


@app.patch("/users/{user_id}/balance", response_model=UserOut)
async def update_user_balance(user_id: int, update: UserBalanceRequest, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User).where(User.user_id == user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user.balance = Decimal(update.balance)
        await session.commit()
        await session.refresh(user)
        return UserOut(
            id=user.id,
            user_id=user.user_id,
            avatar=user.avatar,
            phone_number=user.phone_number,
            join_time=user.join_time.isoformat() if user.join_time else None,
            balance=float(user.balance or 0),
            daily_launches=user.daily_launches or 0,
            total_launches=user.total_launches or 0,
            blocked=getattr(user, "blocked", False)
        )


@app.delete("/users/{user_id}")
async def delete_user(user_id: int, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User).filter_by(user_id=user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        await session.delete(user)
        await session.commit()

        return {"ok": True}


# Поиск пользователей по номеру телефона или TG ID
@app.get("/users/search", response_model=List[UserOut])
async def search_users(q: str, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(User).filter(
            (User.phone_number.ilike(f"%{q}%")) | (User.user_id == q)
        )
        result = await session.execute(query)
        users = result.scalars().all()

        return [
            UserOut(
                id=u.id,
                user_id=u.user_id,
                avatar=u.avatar,
                phone_number=u.phone_number,
                join_time=u.join_time.isoformat() if u.join_time else None,
                balance=float(u.balance or 0),
                daily_launches=u.daily_launches or 0,
                total_launches=u.total_launches or 0,
                blocked=getattr(u, "blocked", False),
                first_name=getattr(u, "first_name", None),
                last_name=getattr(u, "last_name", None),
                source_param=getattr(u, "source_param", None)
            ) for u in users
        ]


# Public
@app.get("/users/{user_id}/orders", response_model=List[OrderOut])
async def get_user_orders(user_id: int):
    async with async_session() as session:
        query = select(Order).filter_by(user_id=user_id)
        query_result = await session.execute(query)
        orders = query_result.scalars().all()
        result = []
        for o in orders:
            query = select(Delivery).filter_by(order_id=o.id)
            query_result = await session.execute(query)
            deliveries = query_result.scalars().all()
            deliveries_out = [
                DeliveryOut(
                    id=d.id,
                    delivery_date=d.delivery_date.isoformat(),
                    status=d.status
                ) for d in deliveries
            ]
            order_out = OrderOut(
                id=o.id,
                user_id=o.user_id,
                status=o.status,
                total_amount=float(o.total_amount or 0),
                created_at=o.created_at.isoformat() if o.created_at else None,
                updated_at=o.updated_at.isoformat() if o.updated_at else None,
                items=json.loads(o.items) if o.items else None,
                order_type=o.order_type,
                deliveries=deliveries_out,
                fio=o.fio,
                phone=o.phone,
                email=o.email,
                comment=o.comment,
            )
            result.append(order_out)
        return result


# --------- Корзина ---------
class CartItemIn(BaseModel):
    user_id: int
    item_id: str
    price: float
    quantity: int = 1
    deliveriesPerMonth: int = 1
    subscriptionMonths: int = 1
    type: CartItemType = CartItemType.ONE_TIME  # <-- добавить!
    deliveryDate: str | None = None
    title: str | None = ""
    photos: Optional[List[str]] = []


class CartItemOut(BaseModel):
    id: int
    user_id: int
    item_id: int
    quantity: int = 1
    price: float
    deliveriesPerMonth: int = 1  # <-- добавить!
    subscriptionMonths: int = 1  # <-- добавить!
    deliveryDate: str | None = None  # ISO format
    type: CartItemType  # <-- добавить!
    title: str = ""
    photos: List[str] = []


@app.post("/cart_items", response_model=CartItemOut)
async def add_to_cart(item: CartItemIn):
    async with async_session() as session:
        try:
            delivery_date = datetime.fromisoformat(item.deliveryDate) if item.deliveryDate else None
        except ValueError:
            delivery_date = None

        cart_item = CartItem(
            user_id=item.user_id,
            item_id=item.item_id,
            quantity=item.quantity,
            deliveryDate=delivery_date,
            deliveriesPerMonth=item.deliveriesPerMonth,
            subscriptionMonths=item.subscriptionMonths,
            price=item.price,
            type=item.type,
            title=item.title,
            photos=json.dumps(item.photos),
        )
        session.add(cart_item)
        await session.commit()
        await session.refresh(cart_item)
        return CartItemOut(
            id=cart_item.id,
            user_id=cart_item.user_id,
            item_id=cart_item.item_id,
            quantity=cart_item.quantity,
            deliveryDate=cart_item.deliveryDate.isoformat() if cart_item.deliveryDate is not None else None,
            deliveriesPerMonth=cart_item.deliveriesPerMonth,
            subscriptionMonths=cart_item.subscriptionMonths,
            price=cart_item.price,
            type=cart_item.type,
            title=cart_item.title,
            photos=json.loads(cart_item.photos)
        )


@app.get("/cart_items", response_model=List[CartItemOut])
async def get_cart(user_id: int):
    async with async_session() as session:
        query = select(CartItem).where(CartItem.user_id == user_id)
        result = await session.execute(query)
        items: list[CartItem] = result.scalars().all()
        return [
            CartItemOut(
                id=i.id,
                user_id=i.user_id,
                item_id=i.item_id,
                quantity=i.quantity,
                deliveryDate=i.deliveryDate.isoformat() if i.deliveryDate is not None else None,
                deliveriesPerMonth=i.deliveriesPerMonth,
                subscriptionMonths=i.subscriptionMonths,
                price=i.price,
                type=i.type,
                title=i.title,
                photos=json.loads(i.photos)
            ) for i in items
        ]


@app.delete("/cart_items/{item_id}")
async def remove_from_cart(item_id: int):
    async with async_session() as session:
        query = select(CartItem).where(CartItem.id == item_id)
        result = await session.execute(query)
        item = result.scalar_one_or_none()
        if not item:
            raise HTTPException(status_code=404, detail="Cart item not found")
        await session.delete(item)
        await session.commit()
        return {"ok": True}


# ----------- Заказы из корзины (frontend) -----------
class CartOrderItem(BaseModel):
    product_id: int
    deliveries_per_month: int | None = None
    subscription_months: int | None = None
    deliveryDate: str | None = None
    price: int
    title: str


class OrderIn(BaseModel):
    user_id: int
    items: List[CartOrderItem]
    total_amount: float
    order_type: str
    fio: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    comment: Optional[str] = None


class CreatePaymentRequest(BaseModel):
    user_id: int
    order_id: int
    amount: float
    description: Optional[str] = "Оплата заказа"
    return_url: str


class TransactionOut(BaseModel):
    id: int
    user_id: int
    order_id: Optional[int]
    amount: float
    status: str
    payment_id: str
    created_at: str


class OrderStatusUpdate(BaseModel):
    status: str


# Public
@app.post("/orders", response_model=OrderOut)
async def create_order(order: OrderIn):
    async with async_session() as session:
        # Гарантируем: каждый item — dict
        items_as_dicts = []
        for item in order.items:
            if hasattr(item, "dict"):
                items_as_dicts.append(item.model_dump())
            else:
                items_as_dicts.append(item)
        db_order = Order(
            user_id=order.user_id,
            status="pending_payment",
            total_amount=Decimal(order.total_amount),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            items=json.dumps(items_as_dicts),
            order_type=order.order_type,
            fio=order.fio,
            phone=order.phone,
            email=order.email,
            comment=order.comment,
        )
        session.add(db_order)
        await session.commit()
        await session.refresh(db_order)

        # --- Создаём Delivery объекты для подписки ---
        deliveries = []
        if order.order_type == "subscription" and order.items:
            item = order.items[0]
            # Универсально: получаем dict
            item_d = item.model_dump() if hasattr(item, "dict") else item
            dpm = item_d.get("deliveries_per_month") or item_d.get("deliveriesPerMonth", 1)
            sm = item_d.get("subscription_months") or item_d.get("subscriptionMonths", 1)
            dpm = int(dpm) if dpm else 1
            sm = int(sm) if sm else 1
            total = dpm * sm
            for i in range(total):
                delivery_date = db_order.created_at + timedelta(days=30 * i // dpm)
                delivery = Delivery(
                    order_id=db_order.id,
                    delivery_date=delivery_date,
                    status="scheduled"
                )
                session.add(delivery)
                deliveries.append(delivery)
            await session.commit()
            deliveries_out = [
                DeliveryOut(
                    id=d.id,
                    delivery_date=d.delivery_date.isoformat(),
                    status=d.status
                ) for d in deliveries
            ]
        else:
            deliveries_out = []

        total_amount = float(db_order.total_amount)
        notification_data = {
            "user_id": order.user_id,
            "text": f"Создан новый заказ #{db_order.id} на сумму {total_amount}₽"
        }
        redis_client = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
        await redis_client.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification_data))

        return OrderOut(
            id=db_order.id,
            user_id=db_order.user_id,
            status=db_order.status,
            total_amount=total_amount,
            created_at=db_order.created_at.isoformat(),
            updated_at=db_order.updated_at.isoformat(),
            items=items_as_dicts,
            order_type=db_order.order_type,
            deliveries=deliveries_out,
            fio=db_order.fio,
            phone=db_order.phone,
            email=db_order.email,
            comment=db_order.comment,
        )


@app.get("/orders", response_model=List[OrderFullOut])
async def get_all_orders(_: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Order).filter(Order.status.notin_(["pending_payment", "canceled"]))
        query_result = await session.execute(query)
        orders = query_result.scalars().all()
        user_ids = {o.user_id for o in orders}

        query = select(User).filter(User.user_id.in_(user_ids))
        query_result = await session.execute(query)
        users = query_result.scalars().all()
        users_map = {u.user_id: u.phone_number for u in users}
        result = []
        for o in orders:
            result.append(OrderFullOut(
                id=o.id,
                user_id=o.user_id,
                phone_number=users_map.get(o.user_id),
                status=o.status,
                total_amount=float(o.total_amount or 0),
                created_at=o.created_at.isoformat() if o.created_at else None,
                updated_at=o.updated_at.isoformat() if o.updated_at else None,
                items=json.loads(o.items) if getattr(o, "items", None) else None,
                order_type=o.order_type,
                fio=o.fio,
                phone=o.phone,
                email=o.email,
                comment=o.comment,
            ))
        return result


@app.patch("/orders/{order_id}/status", response_model=OrderOut)
async def update_order_status(order_id: int, req: OrderStatusUpdate, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Order).where(Order.id == order_id)
        result = await session.execute(query)
        order: Order | None = result.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        order.status = req.status
        await session.commit()
        await session.refresh(order)

        return OrderOut(
            id=order.id,
            user_id=order.user_id,
            status=order.status,
            total_amount=float(order.total_amount),
            created_at=order.created_at.isoformat() if order.created_at else None,
            updated_at=order.updated_at.isoformat() if order.updated_at else None,
            items=json.loads(order.items) if order.items else None,
            fio=order.fio,
            phone=order.phone,
            email=order.email,
            comment=order.comment,
        )


@app.get("/orders/{order_id}/deliveries", response_model=List[DeliveryOut])
async def get_order_deliveries(order_id: int, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Delivery).where(Delivery.order_id == order_id)
        result = await session.execute(query)
        deliveries = result.scalars().all()
        return [DeliveryOut(id=d.id, delivery_date=d.delivery_date.isoformat(), status=d.status) for d in deliveries]


# Public
@app.get("/api/user/{user_id}/transactions", response_model=List[TransactionOut])
async def get_user_transactions(user_id: int):
    async with async_session() as session:
        query = select(Transaction).where(Transaction.user_id == user_id)
        result = await session.execute(query)
        transactions = result.scalars().all()
        return [
            TransactionOut(
                id=t.id,
                user_id=t.user_id,
                order_id=t.order_id,
                amount=float(t.amount),
                status=t.status,
                payment_id=t.payment_id,
                created_at=t.timestamp.isoformat()
            ) for t in transactions
        ]


class UpdateDeliveryDateRequest(BaseModel):
    delivery_date: str  # ISO формат


class DeliveryStatusUpdate(BaseModel):
    status: str


@app.patch("/deliveries/{delivery_id}/date", response_model=DeliveryOut)
async def update_delivery_date(delivery_id: int, req: UpdateDeliveryDateRequest, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Delivery).where(Delivery.id == delivery_id)
        result = await session.execute(query)
        delivery = result.scalar_one_or_none()
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        delivery.delivery_date = datetime.fromisoformat(req.date)
        await session.commit()
        await session.refresh(delivery)
        return DeliveryOut(
            id=delivery.id,
            delivery_date=delivery.delivery_date.isoformat(),
            status=delivery.status
        )


@app.patch("/deliveries/{delivery_id}/status", response_model=DeliveryOut)
async def update_delivery_status(delivery_id: int, req: DeliveryStatusUpdate, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Delivery).where(Delivery.id == delivery_id)
        result = await session.execute(query)
        delivery = result.scalar_one_or_none()
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")
        delivery.status = req.status
        await session.commit()
        await session.refresh(delivery)
        return DeliveryOut(
            id=delivery.id,
            delivery_date=delivery.delivery_date.isoformat(),
            status=delivery.status
        )


# --------- Платежи ---------
def format_phone(phone: str) -> str:
    """
    Приводит номер к формату +7XXXXXXXXXX (E.164).
    Если не удаётся — возвращает None.
    """
    if not phone:
        return None
    digits = re.sub(r'\D', '', phone)
    # Если начинается на 8 и длина 11, заменяем на 7
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    # Если начинается на 7 и длина 11
    if digits.startswith('7') and len(digits) == 11:
        return '+' + digits
    # Если уже с кодом страны (например, +7)
    if digits.startswith('9') and len(digits) == 10:
        return '+7' + digits
    # В других случаях не возвращаем телефон
    return None


# Public
@app.post("/api/pay", response_model=dict)
async def create_payment(data: CreatePaymentRequest):
    async with async_session() as session:
        query = select(Order).where(Order.id == data.order_id)
        result = await session.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.status != "pending_payment":
            raise HTTPException(status_code=409, detail="Заказ уже оплачен или отменён")

        # Собираем customer
        customer = {}
        if order.email:
            customer["email"] = order.email

        phone = format_phone(order.phone)

        if phone:
            customer["phone"] = phone
        if getattr(order, "fio", None):
            customer["full_name"] = order.fio
        elif getattr(order, "first_name", None) or getattr(order, "last_name", None):
            customer["full_name"] = f"{getattr(order, 'first_name', '')} {getattr(order, 'last_name', '')}".strip()

        # Проверка: должен быть хотя бы email или телефон
        if not customer.get("email") and not customer.get("phone"):
            raise HTTPException(status_code=400,
                                detail="Для оплаты требуется указать корректный Email или Телефон в заказе.")

        # Формируем receipt (можно сделать по всем товарам, если order.items — список)
        receipt = {
            "customer": customer,
            "items": [
                {
                    "description": data.description or "Оплата заказа",
                    "quantity": 1.0,
                    "amount": {
                        "value": str(round(data.amount, 2)),
                        "currency": "RUB"
                    },
                    "vat_code": 1,
                    "payment_mode": "full_payment",
                    "payment_subject": "service"  # или "commodity" если физ. товар
                }
            ]
        }

        try:
            payment = Payment.create({
                "amount": {
                    "value": str(round(data.amount, 2)),
                    "currency": "RUB"
                },
                "confirmation": {
                    "type": "redirect",
                    "return_url": data.return_url
                },
                "capture": True,
                "description": data.description,
                "receipt": receipt
            })
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Ошибка создания платежа: {str(e)}")

        db_tran = Transaction(
            user_id=data.user_id,
            order_id=data.order_id,
            amount=data.amount,
            status=payment.status,
            payment_id=payment.id,
            transaction_type="yookassa",
            timestamp=datetime.now(),
            description=data.description
        )
        session.add(db_tran)
        await session.commit()
        await session.refresh(db_tran)
        return {
            "confirmation_url": payment.confirmation.confirmation_url,
            "payment_id": payment.id,
            "status": payment.status,
            "transaction_id": db_tran.id
        }


class DepositPayRequest(BaseModel):
    user_id: int
    amount: float
    description: Optional[str] = "Пополнение баланса"
    return_url: str


# Public
@app.post("/api/deposit_pay")
async def deposit_pay(data: DepositPayRequest):
    async with async_session() as session:
        query = select(User).where(User.user_id == data.user_id)
        result = await session.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        payment = Payment.create({
            "amount": {
                "value": str(round(data.amount, 2)),
                "currency": "RUB"
            },
            "confirmation": {
                "type": "redirect",
                "return_url": data.return_url
            },
            "capture": True,
            "description": data.description
        })

        db_tran = Transaction(
            user_id=data.user_id,
            order_id=None,
            amount=data.amount,
            status=payment.status,
            payment_id=payment.id,
            transaction_type="yookassa",
            timestamp=datetime.now(),
            description=data.description
        )

        session.add(db_tran)
        await session.commit()
        await session.refresh(db_tran)

        return {
            "confirmation_url": payment.confirmation.confirmation_url,
            "payment_id": payment.id,
            "status": payment.status,
            "transaction_id": db_tran.id
        }


# Public
@app.post("/api/deposit_pay_web")
async def deposit_pay_web(data: DepositPayRequest):
    return await deposit_pay(data)


# Public
@app.post("/api/yookassa/webhook")
async def yookassa_webhook(request: Request):
    try:
        payload = await request.json()
        logger.info(f"[Webhook] Получен запрос на /api/yookassa/webhook:")
        logger.info(f"[Webhook] IP клиента: {request.client.host}")
        logger.info(f"[Webhook] Заголовки: {dict(request.headers)}")
        logger.info(f"[Webhook] Payload: {json.dumps(payload, ensure_ascii=False)}")

        # Проверка структуры payload
        if not isinstance(payload, dict) or "object" not in payload or "event" not in payload:
            logger.info("[Webhook] Неверная структура payload")
            raise HTTPException(status_code=400, detail="Invalid payload structure")

        event = payload.get("event")
        payment_obj = payload.get("object", {})
        payment_id = payment_obj.get("id")
        status = payment_obj.get("status")

        logger.info(f"[Webhook] Получено событие: {event}, статус платежа: {status}, payment_id: {payment_id}")

        if not payment_id or not status:
            logger.info("[Webhook] Отсутствует payment_id или status")
            raise HTTPException(status_code=400, detail="Missing payment_id or status")

        # Проверка IP ЮKassa (обновлённый список)
        client_ip = request.client.host
        yookassa_ips = [
            "185.71.76.0/27",
            "185.71.77.0/27",
            "77.75.153.0/25",
            "77.75.156.11",
            "77.75.156.35",
            "77.75.154.128/25",
            "2a02:5180::/32"
        ]
        ip_allowed = False
        for ip_range in yookassa_ips:
            base_ip = ip_range.split("/")[0]
            if client_ip.startswith(base_ip.rsplit(".", 1)[0]):
                ip_allowed = True
                break
        if not ip_allowed:
            logger.info(f"[Webhook] Неверный IP: {client_ip}")
            raise HTTPException(status_code=403, detail="Invalid source IP")

        async with async_session() as session:
            query = select(Transaction).where(Transaction.payment_id == payment_id)
            query_result = await session.execute(query)
            transaction = query_result.scalar_one_or_none()

            if not transaction:
                logger.info(f"[Webhook] Транзакция с payment_id {payment_id} не найдена")
                raise HTTPException(status_code=404, detail="Transaction not found")
            logger.info(f"[Webhook] Найдена транзакция: id={transaction.id}, order_id={transaction.order_id}, user_id={transaction.user_id}, status={transaction.status}")

            # Обновление статуса транзакции
            old_tran_status = transaction.status
            transaction.status = status
            transaction.updated_at = datetime.now()
            logger.info(f"[Webhook] Статус транзакции обновлён: {old_tran_status} -> {transaction.status}")

            # Работа с заказом
            if transaction.order_id:
                query = select(Order).filter_by(id=transaction.order_id)
                query_result = await session.execute(query)
                order = query_result.scalar_one_or_none()
                if not order:
                    logger.info(f"[Webhook] Заказ с id {transaction.order_id} не найден")
                else:
                    logger.info(f"[Webhook] Заказ найден: id={order.id}, user_id={order.user_id}, status={order.status}, total_amount={order.total_amount}")

                    # Логика по статусу платежа
                    if status == "succeeded":
                        old_order_status = order.status
                        order.status = "created"
                        order.updated_at = datetime.now()

                        query = delete(CartItem).filter_by(user_id=order.user_id)
                        await session.execute(query)

                        logger.info(f"[Webhook] Заказ {order.id}: статус обновлён {old_order_status} -> {order.status}, корзина очищена для user_id {order.user_id}")
                        notification_data = {
                            "user_id": order.user_id,
                            "text": f"Ваш заказ #{order.id} успешно оплачен!\n\nВы можете следить за его статусом в разделе Профиль Mini App🤍"
                        }
                        redis_client = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
                        await redis_client.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification_data))
                    elif status == "canceled":
                        old_order_status = order.status
                        order.status = "canceled"
                        order.updated_at = datetime.now()
                        logger.info(f"[Webhook] Заказ {order.id}: статус обновлён {old_order_status} -> {order.status}")
                        try:
                            notification_data = {
                                "user_id": order.user_id,
                                "text": f"Оплата заказа #{order.id} была отменена."
                            }
                            redis_client = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
                            await redis_client.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification_data))
                        except Exception as e:
                            logger.info(f"[Webhook] Ошибка отправки уведомления Telegram: {str(e)}")
                    elif status == "waiting_for_capture":
                        logger.info(f"[Webhook] Платёж ожидает подтверждения (waiting_for_capture) для заказа {order.id}")
                        # Здесь можете реализовать логику подтверждения платежа через ЮKassa при необходимости
                    else:
                        logger.info(f"[Webhook] Неизвестный статус платежа: {status}")

            # Внутри webhook, после проверки transaction и payment
            if transaction.order_id is None and status == "succeeded":
                # Пополнение баланса target_user
                query = select(User).filter_by(user_id=transaction.user_id)
                query_result = await session.execute(query)
                target_user = query_result.scalar_one_or_none()
                if target_user:
                    target_user.balance = float(target_user.balance or 0) + float(transaction.amount)
                    await session.commit()
                    await session.refresh(target_user)
                    # Отправить уведомление получателю
                    notification_data = {
                        "user_id": target_user.user_id,
                        "text": f"Ваш баланс успешно пополнен на {transaction.amount}₽!"
                    }
                    redis_client = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
                    await redis_client.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification_data))
                    # Отправить уведомление плательщику (если есть поле payer_id в transaction)
                    if hasattr(transaction, "payer_id") and transaction.payer_id:
                        query = select(User).filter_by(user_id=transaction.payer_id)
                        query_result = await session.execute(query)
                        payer = query_result.scalar_one_or_none()
                        if payer:
                            display = f"@{target_user.username}" if target_user.username else f"{target_user.user_id}"
                            notification_data = {
                                "user_id": payer.user_id,
                                "text": f"Ваш платёж {transaction.amount}₽ успешно зачислен на баланс пользователя {display}."
                            }
                            redis_client = Redis(host=RedisKeys.HOST, port=RedisKeys.PORT, db=RedisKeys.DATABASE, decode_responses=True)
                            await redis_client.publish(RedisKeys.NOTIFICATION_CHANNEL, json.dumps(notification_data))

            await session.commit()
            logger.info(f"[Webhook] Успешно обработан вебхук для payment_id {payment_id}, статус: {status}")
            return {"ok": True}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.info(f"[Webhook] Ошибка обработки вебхука: {e!r}")
        raise HTTPException(status_code=500, detail=f"Webhook error: {str(e)}")


class UserActionLogIn(BaseModel):
    user_id: int
    phone_number: Optional[str] = None
    action: str
    data: Optional[Any] = None


class UserActionLogOut(BaseModel):
    id: int
    user_id: int
    phone_number: Optional[str]
    action: str
    timestamp: str
    data: Optional[Any]


# Public
@app.post("/user_action", response_model=UserActionLogOut)
async def log_user_action(log: UserActionLogIn):
    async with async_session() as session:
        db_log = UserActionLog(
            user_id=log.user_id,
            phone_number=log.phone_number,
            action=log.action,
            timestamp=datetime.now(),
            data=json.dumps(log.data) if log.data else None
        )
        session.add(db_log)
        await session.commit()
        await session.refresh(db_log)
        return UserActionLogOut(
            id=db_log.id,
            user_id=db_log.user_id,
            phone_number=db_log.phone_number,
            action=db_log.action,
            timestamp=db_log.timestamp.isoformat(),
            data=json.loads(db_log.data) if db_log.data else None
        )


@app.get("/user_actions", response_model=List[UserActionLogOut])
async def get_user_actions(user_id: Optional[int] = None, action: Optional[str] = None, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(UserActionLog)
        if user_id is not None:
            query = query.where(UserActionLog.user_id == user_id)
        if action is not None:
            query = query.where(UserActionLog.action == action)
        query = query.order_by(UserActionLog.timestamp.desc())
        result = await session.execute(query)
        logs = result.scalars().all()
        user_ids = {l.user_id for l in logs}
        query_users = select(User).where(User.user_id.in_(user_ids))
        result_users = await session.execute(query_users)
        users = result_users.scalars().all()
        user_map = {u.user_id: u.phone_number for u in users}
        return [
            UserActionLogOut(
                id=l.id,
                user_id=l.user_id,
                phone_number=l.phone_number if l.phone_number else user_map.get(l.user_id),
                action=l.action,
                timestamp=l.timestamp.isoformat(),
                data=json.loads(l.data) if l.data else None
            ) for l in logs
        ]


class SourceCreate(BaseModel):
    start_param: str
    note: Optional[str] = ""


class SourceStats(BaseModel):
    enter_bot: int = 0
    submit_phone: int = 0
    open_miniapp: int = 0
    add_to_cart: int = 0
    payment: int = 0


class SourceOut(BaseModel):
    id: int
    start_param: str
    note: str
    created_at: str
    visits: int
    stats: SourceStats


class SourceVisitLog(BaseModel):
    start_param: str
    user_id: int
    phone_number: Optional[str] = None


@app.post("/sources", response_model=SourceOut)
async def create_source(data: SourceCreate, _: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Source).where(Source.start_param == data.start_param)
        result = await session.execute(query)
        existing = result.scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Source already exists")
        source = Source(
            start_param=data.start_param,
            note=data.note or "",
            created_at=datetime.now()
        )
        session.add(source)
        await session.commit()
        await session.refresh(source)
        return SourceOut(
            id=source.id,
            start_param=source.start_param,
            note=source.note,
            created_at=source.created_at.isoformat(),
            visits=0,
            stats=SourceStats()
        )


@app.get("/sources", response_model=List[SourceOut])
async def get_sources(_: dict = Security(get_current_admin)):
    async with async_session() as session:
        query = select(Source)
        result = await session.execute(query)
        sources = result.scalars().all()
        result_list = []
        for s in sources:
            query_visits = select(SourceVisit).where(SourceVisit.source_id == s.id)
            visits = (await session.execute(query_visits)).scalars().all()
            user_ids = {v.user_id for v in visits}
            stats = {
                "enter_bot": 0,
                "submit_phone": 0,
                "open_miniapp": 0,
                "add_to_cart": 0,
                "payment": 0,
            }
            if user_ids:
                for action in stats.keys():
                    query_actions = select(UserActionLog).where(
                        UserActionLog.user_id.in_(user_ids),
                        UserActionLog.action == action
                    ).distinct(UserActionLog.user_id)
                    result_actions = await session.execute(query_actions)
                    stats[action] = len(result_actions.scalars().all())
            visits_count = len(user_ids)
            result_list.append(SourceOut(
                id=s.id,
                start_param=s.start_param,
                note=s.note,
                created_at=s.created_at.isoformat(),
                visits=visits_count,
                stats=SourceStats(**stats)
            ))
        return result_list


# Public
@app.post("/source_visit")
async def log_source_visit(data: SourceVisitLog):
    async with async_session() as session:
        query = select(Source).where(Source.start_param == data.start_param)
        result = await session.execute(query)
        source = result.scalar_one_or_none()
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")
        query_existing = select(SourceVisit).where(SourceVisit.source_id == source.id, SourceVisit.user_id == data.user_id)
        result_existing = await session.execute(query_existing)
        existing = result_existing.scalar_one_or_none()
        if not existing:
            visit = SourceVisit(
                source_id=source.id,
                user_id=data.user_id,
                phone_number=data.phone_number,
                visited_at=datetime.now()
            )
            session.add(visit)
            await session.commit()
        return {"ok": True}
