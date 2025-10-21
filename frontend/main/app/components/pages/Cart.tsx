import React, { useState } from 'react';
import './menu.css';
import { useCart } from './CartContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export function Cart() {
    const { cartItems, removeFromCart, clearCart, syncCart } = useCart();

    // Доп. товары (ваза, секатор) через чекбоксы, по умолчанию выбраны
    const [extra, setExtra] = useState({
        vaza: false,
        sekator: false,
    });

    const [showOrderPopup, setShowOrderPopup] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);
    const [paySuccess, setPaySuccess] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    // Форма заказа
    const [fio, setFio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [comment, setComment] = useState('');
    const [formError, setFormError] = useState('');

    // Безопасные товары
    const safeCartItems = (cartItems as any[]).filter(item => item.title !== undefined);

    // Тип заказа
    const getOrderType = () => {
        return safeCartItems.some(
            item => item.type === 'subscription' ||
                (item.subscriptionMonths && item.subscriptionMonths > 1) ||
                (item.deliveriesPerMonth && item.deliveriesPerMonth > 1)
        )
            ? 'subscription'
            : 'one-time';
    };

    const orderType = getOrderType();

    // Суммы товаров
    const itemsPrice = safeCartItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
    const vazaPrice = extra.vaza ? 500 : 0;
    const sekatorPrice = extra.sekator ? 500 : 0;

    // Корректный расчет стоимости доставки
    let deliveryPrice = 0;
    let totalBouquets = 0;
    let totalDeliveries = 0;
    let totalMonths = 0;
    if (safeCartItems.length > 0) {
        deliveryPrice = safeCartItems.reduce((sum, item) => {
            const deliveries = item.deliveriesPerMonth ?? 1;
            const months = item.subscriptionMonths ?? 1;
            totalBouquets += 1;
            totalDeliveries += deliveries;
            totalMonths += months;
            return sum + (500 * deliveries * months);
        }, 0);
    }
    const totalPrice = itemsPrice + vazaPrice + sekatorPrice + deliveryPrice;

    function getUserId() {
        const token = localStorage.getItem('authToken');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user_id;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    function formatPhone(value: string) {
        // Удаляем все нечисловые символы
        let digits = value.replace(/\D/g, '');

        if (digits.startsWith('8')) digits = '7' + digits.slice(1);
        if (!digits.startsWith('7')) digits = '7' + digits;

        // Ограничиваем длину до 11 цифр
        digits = digits.substring(0, 11);

        let formatted = '+7';
        if (digits.length > 1) formatted += '(' + digits.substring(1, 4);
        if (digits.length > 4) formatted += ') ' + digits.substring(4, 7);
        if (digits.length > 7) formatted += ' ' + digits.substring(7, 9);
        if (digits.length > 9) formatted += ' ' + digits.substring(9, 11);

        return formatted;
    }

    function isPhoneComplete(phone: string) {
        return phone.trim().replace(/\D/g, '').length === 11;
    }

    function isEmailValidOrNone(email: string) {
        let regexp = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
        return !email || regexp.test(email);
    }

    function handleOrderClick() {
        setShowOrderPopup(true);
        setFormError('');
    }

    async function handleOrderSubmit() {
        setFormError('');
        if (!fio.trim()) {
            setFormError('Введите ФИО получателя');
            return;
        }
        if (!isPhoneComplete(phone)) {
            setFormError('Введите телефон полностью по формату +7(999) 999 99 99');
            return;
        }
        if (!isEmailValidOrNone(email)) {
            setFormError('Неверный формат email адреса');
            return;
        }

        setIsOrdering(true);

        try {
            const userId = getUserId();

            // Основные товары
            const items = safeCartItems.map((item) => ({
                product_id: item.item_id ?? item.id,
                deliveries_per_month: item.deliveriesPerMonth ?? 1,
                subscription_months: item.subscriptionMonths ?? 1,
                price: item.price,
                title: item.title ?? '',
            }));

            // Вазу и секатор добавляем как доп. позиции
            // if (extra.vaza) {
            //     items.push({
            //         product_id: 0,
            //         deliveries_per_month: 1,
            //         subscription_months: 1,
            //         price: 500,
            //         title: "Ваза к доставке (1 шт)",
            //     });
            // }
            // if (extra.sekator) {
            //     items.push({
            //         product_id: 0,
            //         deliveries_per_month: 1,
            //         subscription_months: 1,
            //         price: 500,
            //         title: "Секатор к доставке (1 шт)",
            //     });
            // }

            // Доставка как отдельная позиция
            if (deliveryPrice > 0) {
                items.push({
                    product_id: 0,
                    deliveries_per_month: 1,
                    subscription_months: 1,
                    price: deliveryPrice,
                    title: 'Доставка (Москва в пределах МКАД)',
                });
            }

            // Формируем заказ
            const orderPayload = {
                user_id: userId,
                items,
                total_amount: totalPrice,
                order_type: orderType,
                fio,
                phone,
                email,
                comment,
            };

            const orderRes = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(orderPayload)
            });
            if (!orderRes.ok) {
                const errorText = await orderRes.text();
                throw new Error("Ошибка при создании заказа: " + errorText);
            }
            const orderData = await orderRes.json();
            const orderId = orderData.id;

            // Логирование действия "add_to_cart"
            try {
                await axios.post(`${API_URL}/user_action`, {
                    user_id: userId,
                    action: "add_to_cart",
                    data: {
                        items: items.map(i => ({ product_id: i.product_id, title: i.title, price: i.price })),
                        total_amount: totalPrice
                    }
                });
            } catch (e) {
                console.log('Ошибка логирования add_to_cart:', e);
            }

            // Оплата
            const payRes = await fetch(`${API_URL}/api/pay`, {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: userId,
                    order_id: orderId,
                    amount: totalPrice,
                    description: "Оплата заказа",
                    return_url: window.location.origin + "/payment-success?order_id=" + orderId
                })
            });
            if (!payRes.ok) {
                const errorText = await payRes.text();
                throw new Error("Ошибка при создании платежа: " + errorText);
            }
            const payData = await payRes.json();

            // Логирование действия "payment"
            try {
                await axios.post(`${API_URL}/user_action`, {
                    user_id: userId,
                    action: "payment",
                    data: {
                        order_id: orderId,
                        amount: totalPrice
                    }
                });
            } catch (e) {
                console.log('Ошибка логирования payment:', e);
            }

            if (window.Telegram?.WebApp) {
                window.Telegram.WebApp.openLink(payData.confirmation_url);
            } else {
                window.location.href = payData.confirmation_url;
            }
            setShowOrderPopup(false);
        } catch (e) {
            setFormError("Ошибка: " + (e instanceof Error ? e.message : "Не удалось оформить заказ/платёж"));
        } finally {
            setIsOrdering(false);
        }
    }

    function handleRemoveItem(cartItemId: number) {
        removeFromCart(cartItemId);
    }

    function handleChangeExtra(key: 'vaza' | 'sekator') {
        setExtra(e => ({ ...e, [key]: !e[key] }));
    }

    const isCartEmpty = safeCartItems.length === 0;

    // Формируем строку для доставки
    let deliveryDetails = '';
    if (!isCartEmpty && deliveryPrice > 0) {
        // Считаем итоговое количество доставок (суммарное по всем букетам)
        let bouquetsInfo = safeCartItems.map(item => {
            const deliveries = item.deliveriesPerMonth ?? 1;
            const months = item.subscriptionMonths ?? 1;
            return `${deliveries * months} достав${deliveries * months === 1 ? 'ка' : 'ки'} для «${item.title}»`;
        });
        deliveryDetails = bouquetsInfo.join(', ');
    }

    return (
        <div className="menu-container" style={{ paddingTop: 30, paddingBottom: 120 }}>
            <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
                {/* ---- Карточки товаров ---- */}
                {isCartEmpty && !paySuccess ? (
                    <div style={{ textAlign: "center", marginTop: 40, color: "var(--color-gray-600)" }}>
                        Ваша корзина пуста
                    </div>
                ) : paySuccess ? (
                    <div style={{ textAlign: "center", marginTop: 50, color: "#159C5B" }}>
                        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>Заказ успешно оформлен!</div>
                        <div style={{ fontSize: 16, color: "var(--color-black)" }}>С вами свяжутся для подтверждения доставки.</div>
                    </div>
                ) : (
                    <div>
                        {/* --- Основные товары --- */}
                        {safeCartItems.map((item) => (
                            <div key={item.id} className="cart-item-card" style={{ marginBottom: 16 }}>
                                <div className="cart-item-image-container">
                                    {item.photos && item.photos[0] ? (
                                        <img src={item.photos[0]} alt={item.title} className="cart-item-image"/>
                                    ) : (
                                        <div className="cart-item-no-image">Нет фото</div>
                                    )}
                                </div>
                                <div className="cart-item-content">
                                    <div className="cart-item-title">{item.title}</div>
                                    <div className="cart-item-row">
                                        <span className="cart-item-label">Доставок в месяц:</span>
                                        <span className="cart-item-value">{item.deliveriesPerMonth ?? 1}</span>
                                    </div>
                                    <div className="cart-item-row">
                                        <span className="cart-item-label">Количество месяцев:</span>
                                        <span className="cart-item-value">{item.subscriptionMonths ?? 1}</span>
                                    </div>
                                    <div className="cart-item-row">
                                        <span className="cart-item-label">Сумма:</span>
                                        <span className="cart-item-price">{item.price} руб.</span>
                                    </div>
                                </div>
                                <button
                                    className="cart-item-remove"
                                    title="Удалить товар"
                                    onClick={() => handleRemoveItem(item.id)}
                                    aria-label="Удалить товар"
                                >×
                                </button>
                            </div>
                        ))}

                        {/*      /!* --- Чекбоксы для доп. товаров --- *!/*/}
                        {/*      {!isCartEmpty && (*/}
                        {/*          <div style={{ marginBottom: 22, marginTop: 10 }}>*/}
                        {/*              <label style={{*/}
                        {/*                  display: "flex",*/}
                        {/*                  alignItems: "flex-start",*/}
                        {/*                  fontSize: 18,*/}
                        {/*                  cursor: "pointer",*/}
                        {/*                  marginBottom: 18*/}
                        {/*              }}>*/}
                        {/*                  <input*/}
                        {/*                      type="checkbox"*/}
                        {/*                      checked={extra.vaza}*/}
                        {/*                      onChange={() => handleChangeExtra('vaza')}*/}
                        {/*                      style={{ width: 22, height: 22, marginRight: 12, marginTop: 6 }}*/}
                        {/*                  />*/}
                        {/*                  <span>*/}
                        {/*  <div style={{ fontWeight: 500 }}>*/}
                        {/*    Ваза к первой доставке*/}
                        {/*  </div>*/}
                        {/*  <div style={{ fontWeight: 700, color: "#000000", marginTop: 2 }}>*/}
                        {/*    +500 р*/}
                        {/*  </div>*/}
                        {/*</span>*/}
                        {/*              </label>*/}
                        {/*              <label style={{*/}
                        {/*                  display: "flex",*/}
                        {/*                  alignItems: "flex-start",*/}
                        {/*                  fontSize: 18,*/}
                        {/*                  cursor: "pointer",*/}
                        {/*                  marginBottom: 18*/}
                        {/*              }}>*/}
                        {/*                  <input*/}
                        {/*                      type="checkbox"*/}
                        {/*                      checked={extra.sekator}*/}
                        {/*                      onChange={() => handleChangeExtra('sekator')}*/}
                        {/*                      style={{ width: 22, height: 22, marginRight: 12, marginTop: 6 }}*/}
                        {/*                  />*/}
                        {/*                  <span>*/}
                        {/*  <div style={{ fontWeight: 500 }}>*/}
                        {/*    Секатор к первой доставке*/}
                        {/*  </div>*/}
                        {/*  <div style={{ fontWeight: 700, color: "#000000", marginTop: 2 }}>*/}
                        {/*    +500 р*/}
                        {/*  </div>*/}
                        {/*</span>*/}
                        {/*              </label>*/}
                        {/*          </div>*/}
                        {/*      )}*/}

                        {/* --- Доставка --- */}
                        {!isCartEmpty && (
                            <div style={{ fontWeight: 500, fontSize: 17, marginTop: 12, marginBottom: 4 }}>
                                Доставка (Москва в пределах МКАД): <span style={{ fontWeight: 700, color: "#000000" }}>{deliveryPrice} руб.</span>
                            </div>
                        )}
                        {/* --- Число доставок/букетов --- */}
                        {!isCartEmpty && deliveryDetails && (
                            <div style={{ fontWeight: 400, fontSize: 15, color: "#555", marginBottom: 18 }}>
                                {`За ${deliveryDetails}`}
                            </div>
                        )}

                        {/* --- Итог --- */}
                        {!isCartEmpty && (
                            <div style={{
                                textAlign: "right",
                                fontWeight: 700,
                                fontSize: 20,
                                color: "var(--color-black)",
                                marginTop: 8,
                                marginBottom: 18,
                                paddingRight: 10
                            }}>
                                Итого: <span style={{ color: "#000000" }}>{totalPrice} руб.</span>
                            </div>
                        )}
                        {payError && (
                            <div style={{ color: "#D03A3A", margin: "10px 0", textAlign: "center" }}>
                                {payError}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* --- Кнопка оформления --- */}
            {!isCartEmpty && !paySuccess && (
                <button
                    className="select-button"
                    style={{
                        position: "fixed",
                        left: "50%",
                        transform: "translateX(-50%)",
                        bottom: 84,
                        width: "92%",
                        maxWidth: 500,
                        zIndex: 1234
                    }}
                    onClick={handleOrderClick}
                    disabled={isOrdering}
                >
                    Оформить заказ
                </button>
            )}

            {/* --- Попап оформления заказа --- */}
            {showOrderPopup && (
                <div className="modal-overlay active">
                    <div
                        className="modal-content new-design"
                        style={{
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <button className="modal-close" onClick={() => setShowOrderPopup(false)}>×</button>
                        <h2 className="modal-title">Уточните детали доставки</h2>
                        <label className="modal-label">ФИО получателя</label>
                        <input className="modal-input" value={fio} onChange={e => setFio(e.target.value)} required/>
                        <label className="modal-label">Телефон получателя</label>
                        <input
                            className="modal-input"
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(formatPhone(e.target.value))}
                            placeholder="+7(___) ___ __ __"
                            required
                            maxLength={17}
                        />
                        <label className="modal-label">Email (необязательно)</label>
                        <input className="modal-input" value={email} onChange={e => setEmail(e.target.value)}/>
                        <label className="modal-label">Комментарий (необязательно)</label>
                        <textarea
                            className="modal-input"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                            style={{
                                height: '30px',
                                minHeight: '30px',
                                maxHeight: '120px',
                                resize: 'vertical'
                            }}
                        />
                        {!isCartEmpty && (
                            <div className="modal-price-block">
                                Итого к оплате: <span className="modal-price-value">{totalPrice} руб.</span>
                            </div>
                        )}
                        {formError && <div className="modal-error">{formError}</div>}
                        <button className="modal-cart-btn" onClick={handleOrderSubmit} disabled={isOrdering}>
                            {isOrdering ? "Оформление..." : "Перейти к оплате"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}