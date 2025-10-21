// app/components/AuthComponent.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export function AuthComponent({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Логгирование запуска миниэппа после успешной аутентификации
    // noinspection JSUnusedLocalSymbols
    const logUserAction = async (action: string, data?: any) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            const payload = JSON.parse(atob(token.split('.')[1]));
            await axios.post(`${API_URL}/user_action`, {
                user_id: payload.user_id,
                action,
                data,
            });
        } catch (e) {
            console.log(`Ошибка логирования действия ${action}:`, e);
        }
    };

    useEffect(() => {
        const authenticate = async () => {
            console.log('AuthComponent: Начало аутентификации');
            console.log('AuthComponent: API_URL', API_URL);
            console.log('AuthComponent: Проверка window.Telegram', window.Telegram);

            if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
                console.log('AuthComponent: Telegram WebApp найден');
                const initData = window.Telegram.WebApp.initData;
                console.log('AuthComponent: initData', initData);

                if (!initData) {
                    console.error('AuthComponent: initData отсутствует');
                    setError('Init data not available');
                    return;
                }

                try {
                    console.log('AuthComponent: Отправка запроса на', `${API_URL}/api/auth`);
                    console.log('AuthComponent: Отправляемые данные', { initData });

                    const response = await axios.post(
                        `${API_URL}/api/auth`,
                        { initData },
                        {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 10000,
                        }
                    );
                    const { token } = response.data;
                    localStorage.setItem('authToken', token);
                    setIsAuthenticated(true);

                    // Логгируем вход пользователя
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        await axios.post(`${API_URL}/user_action`, {
                            user_id: payload.user_id,
                            action: "enter_bot",
                            data: { source: "AuthComponent" }
                        });
                    } catch (e) {
                        console.log("Ошибка логирования входа:", e);
                    }

                    // Логгируем запуск миниэппа (можно добавить сюда или ниже, если нужен отдельный момент)
                    try {
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        await axios.post(`${API_URL}/user_action`, {
                            user_id: payload.user_id,
                            action: "open_miniapp",
                            data: { source: "webapp" }
                        });
                    } catch (e) {
                        console.log("Ошибка логирования запуска миниэппа:", e);
                    }

                } catch (err: any) {
                    if (err.response) {
                        // Проверка на статус 403
                        if (err.response.status === 403) {
                            setError(err.response.data.detail || "Вы были заблокированы - обратитесь к администратору");
                        } else {
                            setError(`Authentication failed: ${err.response.data.detail || err.message}`);
                        }
                    } else if (err.code === 'ERR_NETWORK') {
                        setError(`Network error: Unable to connect to ${API_URL}/api/auth`);
                    } else {
                        setError(`Authentication failed: ${err.message}`);
                    }
                }

            } else {
                console.error('AuthComponent: Telegram Web App не найден');
                console.log('AuthComponent: window.Telegram', window.Telegram);
                setError('Telegram Web App not detected');
            }
        };

        authenticate();
    }, []);

    if (error) {
        console.log('AuthComponent: Отображение ошибки', error);
        return <div className="text-center text-red-500">Error: {error}</div>;
    }

    if (!isAuthenticated) {
        console.log('AuthComponent: Ожидание аутентификации');
        return (
            <div style={{ marginTop: 40, textAlign: 'center' }}>
                Загрузка товаров...
            </div>
        );
    }

    console.log('AuthComponent: Рендеринг дочерних компонентов');
    return <>{children}</>;
}