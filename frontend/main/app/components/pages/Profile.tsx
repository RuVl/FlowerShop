import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./profile.css";

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
    const token = localStorage.getItem("authToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchUser(user_id: number) {
    const { data } = await axios.get(`${API_URL}/users/${user_id}`, {
        headers: authHeaders(),
    });
    return data;
}

async function fetchUserOrders(user_id: number) {
    const { data } = await axios.get(`${API_URL}/users/${user_id}/orders`, {
        headers: authHeaders(),
    });
    return data;
}

// --- Types ---
type CartOrderItem = {
    product_id: number;
    title: string;
    deliveries_per_month?: number;
    subscription_months?: number;
    deliveriesPerMonth?: number;
    subscriptionMonths?: number;
    deliveryDate?: string;
    price: number;
    type?: string;
};

type Delivery = {
    id: number;
    delivery_date: string;
    status: string;
};

type Order = {
    id: number;
    date: string;
    title: string;
    amount: string;
    status: string;
    order_type?: "subscription" | "one-time";
    items?: CartOrderItem[];
    deliveries?: Delivery[];
    subscription_status?: "active" | "inactive";
};

type User = {
    id: number;
    user_id: number;
    avatar?: string;
    phone_number?: string;
    balance?: number;
    blocked?: boolean;
    first_name?: string;
    last_name?: string;
};

// --- Status helpers ---
function getStatusColor(status: string) {
    if (status === "created" || status === "pending_payment") return "ph-status-wait";
    if (status === "assembling") return "ph-status-intransit";
    if (status === "delivering") return "ph-status-intransit";
    if (status === "delivered") return "ph-status-delivered";
    if (status === "canceled") return "ph-status-canceled";
    if (status === "scheduled") return "ph-status-wait";
    if (status === "inactive") return "ph-status-canceled";
    if (status === "active") return "ph-status-delivered";
    return "";
}

function getStatusLabel(status: string) {
    switch (status) {
        case "pending_payment":
            return "Ожидание оплаты";
        case "created":
            return "Ожидает сборки";
        case "assembling":
            return "Собирается";
        case "delivering":
            return "В доставке";
        case "delivered":
            return "Доставлено";
        case "canceled":
            return "Отменён";
        case "scheduled":
            return "Запланирована";
        case "active":
            return "Активна";
        case "inactive":
            return "Неактивна";
        default:
            return status;
    }
}

function getTypeBadge(type: string | undefined, subscription_status?: "active" | "inactive") {
    if (type === "subscription") {
        return (
            <span className={`ph-type-badge sub ${subscription_status === "inactive" ? "inactive" : ""}`}>
        Подписка
      </span>
        );
    }
    return <span className="ph-type-badge one">Разовый</span>;
}

// --- Main Profile Component ---
export function Profile() {
    const [user, setUser] = useState<User | null>(null);
    const [activeOrders, setActiveOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<Order[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [modalOrder, setModalOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    // noinspection JSUnusedLocalSymbols
    const [balance, setBalance] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // --- Пополнение ---
    // noinspection JSUnusedLocalSymbols
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositSum, setDepositSum] = useState<number>(500);
    // noinspection JSUnusedLocalSymbols
    const [depositError, setDepositError] = useState<string | null>(null);
    // noinspection JSUnusedLocalSymbols
    const [depositLoading, setDepositLoading] = useState(false);

    // Получаем user_id из токена (декодируем JWT)
    const getUserIdFromToken = useCallback(() => {
        const token = localStorage.getItem("authToken");
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            return payload.user_id;
        } catch {
            return null;
        }
    }, []);

    // Проверка статуса подписки: active/ inactive
    function getSubscriptionStatus(order: Order): "active" | "inactive" | undefined {
        if (order.order_type !== "subscription" || !order.deliveries || order.deliveries.length === 0) return undefined;
        const hasActiveDelivery = order.deliveries.some(
            (d) => d.status !== "delivered" && d.status !== "canceled"
        );
        return hasActiveDelivery ? "active" : "inactive";
    }

    // Загрузка данных пользователя и заказов
    useEffect(() => {
        const loadProfile = async () => {
            setLoading(true);
            setError(null);
            const user_id = getUserIdFromToken();
            if (!user_id) {
                setError("Не удалось получить ID пользователя");
                setLoading(false);
                return;
            }
            try {
                const userData = await fetchUser(user_id);
                setUser(userData);
                setBalance(userData.balance || 0);

                const ordersData = await fetchUserOrders(user_id);
                const normalizedOrders: Order[] = ordersData.map((o: any) => {
                    let items: CartOrderItem[] = [];
                    if (Array.isArray(o.items)) items = o.items;
                    else if (typeof o.items === "string") {
                        try {
                            items = JSON.parse(o.items);
                        } catch {
                        }
                    }
                    let deliveries: Delivery[] = [];
                    if (Array.isArray(o.deliveries)) deliveries = o.deliveries;

                    const order_type = o.order_type || "one-time";
                    let subscription_status: "active" | "inactive" | undefined = undefined;
                    if (order_type === "subscription") {
                        subscription_status = getSubscriptionStatus({ ...o, items, deliveries, order_type });
                    }

                    return {
                        id: o.id,
                        date: o.created_at ? o.created_at.split("T")[0] : "",
                        title: Array.isArray(items) && items[0]?.title ? items[0].title : "Заказ",
                        amount: (typeof o.total_amount === "number"
                            ? o.total_amount.toLocaleString("ru-RU")
                            : o.total_amount) + " ₽",
                        status: o.status,
                        order_type,
                        items,
                        deliveries,
                        subscription_status,
                    };
                });

                setHistory(
                    normalizedOrders.filter(
                        (o) =>
                            (o.order_type === "subscription" && o.subscription_status === "inactive") ||
                            ((o.order_type !== "subscription") && (o.status === "delivered" || o.status === "canceled"))
                    )
                );
                setActiveOrders(
                    normalizedOrders.filter(
                        (o) =>
                            (o.order_type === "subscription" && o.subscription_status === "active") ||
                            ((o.order_type !== "subscription") && (o.status !== "delivered" && o.status !== "canceled"))
                    )
                );
            } catch (err: any) {
                setError(
                    "Ошибка загрузки профиля: " +
                    (err.response?.data?.detail || err.message)
                );
            } finally {
                setLoading(false);
            }
        };
        loadProfile().then();
    }, [getUserIdFromToken]);

    // Новый функционал пополнения баланса
    // noinspection JSUnusedLocalSymbols
    async function handleDeposit() {
        setDepositError(null);
        setDepositLoading(true);
        try {
            const user_id = getUserIdFromToken();
            if (!user_id) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Нет user_id");
            }
            // Запрос на backend: создать платёж на сумму depositSum, без заказа
            const res = await axios.post(`${API_URL}/api/deposit_pay_web`, {
                user_id,
                amount: depositSum,
                description: `Пополнение баланса на ${depositSum} руб.`,
                return_url: window.location.origin + "/profile"
            });
            const payData = res.data;
            setShowDeposit(false);
            // Перенаправить на оплату
            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openLink(payData.confirmation_url);
            } else {
                window.location.href = payData.confirmation_url;
            }
        } catch (e: any) {
            setDepositError(e?.message || "Ошибка создания платежа");
        } finally {
            setDepositLoading(false);
        }
    }


    // Обработка инпута для суммы (только числа, без авто-ноль)
    // noinspection JSUnusedLocalSymbols
    function handleDepositInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const v = e.target.value.replace(/\D/g, "");
        if (v === "" || v === "0") {
            setDepositSum(0);
            return;
        }
        if (v.length > 5) {
            setDepositSum(parseFloat(v.slice(0, 5)));
            return;
        }
        setDepositSum(parseFloat(v));
    }

    const historyToShow = showAll ? history : history.slice(0, 3);

    const getDisplayName = (user: User) => {
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
        return fullName || "Пользователь";
    };

    function renderDeliveryInfo(order: Order) {
        if (!order.items || order.items.length === 0) return null;
        const item = order.items[0];
        const deliveriesPerMonth =
            item.deliveries_per_month ?? item.deliveriesPerMonth ?? 1;
        const subscriptionMonths =
            item.subscription_months ?? item.subscriptionMonths ?? 1;
        const totalDeliveries = deliveriesPerMonth * subscriptionMonths;

        if (order.order_type === "subscription") {
            return (
                <>
                    <div className="ph-modal-sub-block">
                        <div className="ph-mini-badge-container">
                            <span className="ph-mini-badge-title">Доставок в месяц:</span>
                            <span className="ph-mini-badge-value">{deliveriesPerMonth}</span>
                        </div>
                        <div className="ph-mini-badge-container">
                            <span className="ph-mini-badge-title">Месяцев:</span>
                            <span className="ph-mini-badge-value">{subscriptionMonths}</span>
                        </div>
                        <div className="ph-mini-badge-container">
                            <span className="ph-mini-badge-title">Всего доставок:</span>
                            <span className="ph-mini-badge-value">{totalDeliveries}</span>
                        </div>
                    </div>
                    <div className="ph-modal-deliveries-title">Доставки по подписке:</div>
                    {order.deliveries && order.deliveries.length > 0 ? (
                        order.deliveries
                            .sort((a, b) => new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime())
                            .map((d, idx) => (
                                <div key={d.id} className="ph-delivery-card">
                                    <div className="ph-delivery-circle">{idx + 1}</div>
                                    <div className="ph-delivery-info">
                                        <div className="ph-delivery-info-style">
                                            <span className="ph-delivery-label">Дата:</span>{" "}
                                            <span className="ph-delivery-date">
                        {new Date(d.delivery_date).toLocaleDateString("ru-RU")}
                      </span>
                                        </div>
                                        <div className="ph-delivery-info-style">
                                            <span className="ph-delivery-label">Статус:</span>{" "}
                                            <span className={`ph-delivery-status ${getStatusColor(d.status)}`}>
                        {getStatusLabel(d.status)}
                      </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                    ) : (
                        <div style={{ color: "#888", fontSize: "0.98em" }}>Нет данных о доставках</div>
                    )}
                </>
            );
        } else {
            return (
                <div className="ph-modal-sub-block">
                </div>
            );
        }
    }

    if (loading)
        return (
            <div style={{ marginTop: 20, textAlign: "center" }}>
                Загрузка профиля...
            </div>
        );
    if (error) return <div className="text-red-500">{error}</div>;
    if (!user) return <div>Данные пользователя не найдены</div>;

    return (
        <div className="profile-root">
            <div className="profile-avatar-wrap">
                <img className="profile-avatar" src={user.avatar} alt="avatar"/>
            </div>
            <div className="profile-main">
                <div className="profile-name">{getDisplayName(user)}</div>
                {user.phone_number && (
                    <div className="profile-phone">{user.phone_number}</div>
                )}
            </div>

            {/* Активные заказы */}
            <div className="profile-history">
                <div className="ph-title">Активные заказы</div>
                {activeOrders.length > 0 ? (
                    <div className="ph-list">
                        {activeOrders.map((order) => (
                            <div
                                key={order.id}
                                className="ph-container-card"
                                onClick={() => setModalOrder(order)}
                                tabIndex={0}
                                role="button"
                            >
                                <div className="ph-container-title">{order.title}</div>
                                <div className="ph-container-date-row">
                                    <div className="ph-container-date">{order.date}</div>
                                    <div className="ph-container-amount">{order.amount}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="ph-empty">Нет активных заказов</div>
                )}
            </div>
            {/* История заказов */}
            <div className="profile-history">
                <div className="ph-title">История заказов</div>
                <div className="ph-list">
                    {historyToShow.map((o) => (
                        <div
                            key={o.id}
                            className="ph-container-card"
                            onClick={() => setModalOrder(o)}
                            tabIndex={0}
                            role="button"
                        >
                            <div className="ph-container-row">
                                <div className="ph-container-title">{o.title}</div>
                                {getTypeBadge(o.order_type, o.subscription_status)}
                                <span
                                    className={`ph-status ${getStatusColor(o.status)}`}
                                    style={{ marginLeft: 8 }}
                                >
                  {o.order_type === "subscription"
                      ? getStatusLabel(o.subscription_status ?? "")
                      : getStatusLabel(o.status)}
                </span>
                            </div>
                            <div className="ph-container-date-row">
                                <div className="ph-container-date">{o.date}</div>
                                <div className="ph-container-amount">{o.amount}</div>
                            </div>
                        </div>
                    ))}
                </div>
                {history.length > 3 && (
                    <button
                        className="profile-showall-btn"
                        onClick={() => setShowAll((v) => !v)}
                    >
                        {showAll ? "Скрыть" : "Показать все"}
                    </button>
                )}
            </div>
            {/* Модальное окно заказа */}
            {modalOrder && (
                <div className="ph-modal-overlay" onClick={() => setModalOrder(null)}>
                    <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="ph-modal-close"
                            onClick={() => setModalOrder(null)}
                        >
                            ×
                        </button>
                        <div className="ph-modal-scrollable-content">
                            <div className="ph-modal-title">{modalOrder.title}</div>
                            <div className="ph-modal-row">
                                <span className="ph-modal-label">Тип: </span>
                                {getTypeBadge(
                                    modalOrder.order_type,
                                    modalOrder.subscription_status
                                )}
                            </div>
                            <div className="ph-modal-row">
                                <span className="ph-modal-label">Статус: </span>
                                <span
                                    className={`ph-status ${getStatusColor(modalOrder.status)}`}
                                >
                  {modalOrder.order_type === "subscription"
                      ? getStatusLabel(modalOrder.subscription_status ?? "")
                      : getStatusLabel(modalOrder.status)}
                </span>
                            </div>
                            <div className="ph-modal-row">
                                <span className="ph-modal-label">Дата заказа: </span>
                                <span>{modalOrder.date}</span>
                            </div>
                            <div className="ph-modal-row">
                                <span className="ph-modal-label">Стоимость: </span>
                                <span>{modalOrder.amount}</span>
                            </div>
                            {/* Информация по подписке + карточки доставок */}
                            {renderDeliveryInfo(modalOrder)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}