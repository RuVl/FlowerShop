import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export interface CartItem {
    id: number;
    item_id?: string;
    title?: string;
    price: number;
    photos?: string[];
    product_id?: number;
    deliveriesPerMonth?: number;
    subscriptionMonths?: number;
    quantity?: number;
    type?: 'subscription' | 'one-time';
}

interface TransactionOut {
    id: number;
    user_id: number;
    order_id?: number;
    amount: number;
    status: string;
    payment_id: string;
    created_at: string;
}

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: number) => void;
    clearCart: () => void;
    syncCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
    cartItems: [],
    addToCart: () => {
    },
    removeFromCart: () => {
    },
    clearCart: () => {
    },
    syncCart: async () => {
    },
});

export const useCart = () => useContext(CartContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [userId, setUserId] = useState<number | null>(null);

    // Получение userId из токена
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setUserId(payload.user_id);
                console.log('[CartContext] userId из токена:', payload.user_id);
            } catch (e) {
                setUserId(null);
                console.log('[CartContext] Ошибка парсинга токена:', e);
            }
        }
    }, []);

    // Синхронизация корзины при изменении userId
    useEffect(() => {
        if (userId) {
            syncCart();
        }
    }, [userId]);

    // Polling для проверки статуса транзакций
    useEffect(() => {
        if (!userId) return;

        const checkPendingPayments = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/user/${userId}/transactions`, {
                    headers: { "ngrok-skip-browser-warning": "true" }
                });
                const transactions: TransactionOut[] = res.data;
                console.log('[CartContext] Транзакции:', transactions);
                const hasPending = transactions.some(t => t.status === 'pending');
                if (!hasPending) {
                    await syncCart(); // Синхронизируем корзину, если нет pending транзакций
                }
            } catch (e) {
                console.log('[CartContext] Ошибка проверки транзакций:', e);
            }
        };

        const interval = setInterval(checkPendingPayments, 10000); // Проверять каждые 10 секунд
        return () => clearInterval(interval); // Очистка при размонтировании
    }, [userId]);

    // Синхронизация корзины с сервером
    const syncCart = async () => {
        if (!userId) {
            console.log('[CartContext] Нет userId для syncCart');
            return;
        }
        try {
            const res = await axios.get(`${API_URL}/cart_items?user_id=${userId}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            console.log('[CartContext] Ответ сервера /cart_items:', res.data);
            setCartItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.log('[CartContext] Ошибка получения корзины:', e);
            setCartItems([]);
        }
    };

    // Добавление товара в корзину
    const addToCart = async (item: CartItem) => {
        if (!userId) {
            console.log('[CartContext] Нет userId для добавления в корзину');
            return;
        }
        try {
            const payload = {
                user_id: userId,
                item_id: (item.product_id || item.id).toString(),
                price: item.price,
                quantity: item.quantity || 1,
                deliveriesPerMonth: item.deliveriesPerMonth ?? 1,
                subscriptionMonths: item.subscriptionMonths ?? 1,
                type: item.type, // <-- ДОБАВЬ ЭТО!
                title: item.title ?? "",
                photos: item.photos ?? [],
            };
            console.log('[CartContext] addToCart payload:', payload);
            await axios.post(`${API_URL}/cart_items`, payload, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            await syncCart();
        } catch (e) {
            console.log('[CartContext] Ошибка addToCart:', e);
        }
    };

    // Удаление товара из корзины
    const removeFromCart = async (cartItemId: number) => {
        try {
            console.log('[CartContext] removeFromCart id:', cartItemId);
            await axios.delete(`${API_URL}/cart_items/${cartItemId}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            await syncCart();
        } catch (e) {
            console.log('[CartContext] Ошибка removeFromCart:', e);
        }
    };

    // Очистка корзины
    const clearCart = async () => {
        if (!userId) {
            console.log('[CartContext] Нет userId для очистки корзины');
            return;
        }
        try {
            await axios.delete(`${API_URL}/cart_items?user_id=${userId}`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            setCartItems([]);
            await syncCart();
        } catch (e) {
            console.log('[CartContext] Ошибка clearCart:', e);
        }
    };

    return (
        <CartContext.Provider
            value={{ cartItems, addToCart, removeFromCart, clearCart, syncCart }}
        >
            {children}
        </CartContext.Provider>
    );
};