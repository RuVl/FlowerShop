import React, { useEffect, useState } from 'react';
import './menu.css';
import axios from 'axios';
import { useCart } from './CartContext';

interface Product {
    id: number;
    title: string;
    description: string;
    photos: string[];
    price_per_delivery: number;
    max_deliveries: number;
    max_months: number;
    type: 'Букеты' | 'Живые цветы';
    size?: 'S' | 'M' | 'L';
}

const API_URL = import.meta.env.VITE_API_URL;

function getDiscountedPrice(deliveriesPerMonth: number, subscriptionMonths: number, pricePerDelivery: number) {
    const totalBouquets = deliveriesPerMonth * subscriptionMonths;
    let discountPercent = 0;
    if (totalBouquets >= 12) discountPercent = 15;
    else if (totalBouquets >= 8) discountPercent = 10;
    else if (totalBouquets >= 4) discountPercent = 5;

    const originalTotal = pricePerDelivery * totalBouquets;
    const discountAmount = (originalTotal * discountPercent) / 100;
    const finalTotal = originalTotal - discountAmount;
    return {
        discountPercent,
        originalTotal,
        finalTotal: Math.round(finalTotal),
        discountAmount: Math.round(discountAmount),
        totalBouquets,
    };
}

export function Menu({ onGoToCart }: { onGoToCart?: () => void }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState<'bouquets' | 'fresh'>('bouquets');
    const [modalItem, setModalItem] = useState<null | Product>(null);
    const [modalImageIndex, setModalImageIndex] = useState<number>(0);
    const [modalTouchStartX, setModalTouchStartX] = useState<number | null>(null);

    const [modalMode, setModalMode] = useState<'subscription' | 'one-time'>('subscription');
    const [deliveriesPerMonth, setDeliveriesPerMonth] = useState<number>(1);
    const [subscriptionMonths, setSubscriptionMonths] = useState<number>(1);
    const [deliveryDate, setDeliveryDate] = useState<string>('');
    const [error, setError] = useState<string>('');
    const { addToCart } = useCart();

    useEffect(() => {
        setLoading(true);
        axios.get<Product[]>(`${API_URL}/products`, {
            headers: { "ngrok-skip-browser-warning": "true" }
        })
            .then(res => setProducts(res.data))
            .catch(() => setProducts([]))
            .finally(() => setLoading(false));
    }, []);

    const bouquets = products.filter(p => p.type === 'Букеты');
    const freshFlowers = products.filter(p => p.type === 'Живые цветы');
    const items = activeCategory === 'bouquets' ? bouquets : freshFlowers;

    const openModal = (item: Product) => {
        setModalItem(item);
        setModalImageIndex(0);
        setModalMode('subscription');
        setDeliveriesPerMonth(1);
        setSubscriptionMonths(1);
        setDeliveryDate('');
        setError('');
    };

    const closeModal = () => {
        setModalItem(null);
        setModalImageIndex(0);
        setError('');
        setDeliveryDate('');
        setModalMode('subscription');
    };

    const handleModalImageNav = (direction: 'prev' | 'next') => {
        if (!modalItem) return;
        const maxIndex = modalItem.photos.length - 1;
        let newIndex = direction === 'next' ? modalImageIndex + 1 : modalImageIndex - 1;
        if (newIndex < 0) newIndex = maxIndex;
        if (newIndex > maxIndex) newIndex = 0;
        setModalImageIndex(newIndex);
    };
    const handleModalTouchStart = (e: React.TouchEvent) => setModalTouchStartX(e.touches[0].clientX);
    const handleModalTouchEnd = (e: React.TouchEvent) => {
        if (!modalItem) return;
        const touchEndX = e.changedTouches[0].clientX;
        if (modalTouchStartX === null) return;
        const deltaX = modalTouchStartX - touchEndX;
        const swipeThreshold = 50;
        if (deltaX > swipeThreshold) handleModalImageNav('next');
        else if (deltaX < -swipeThreshold) handleModalImageNav('prev');
        setModalTouchStartX(null);
    };

    const addToCartHandler = async () => {
        if (!modalItem) return;
        if (modalMode === 'one-time' && !deliveryDate) {
            setError('Пожалуйста, выберите дату доставки.');
            return;
        }

        let price;
        let discountPercent = 0;
        if (modalMode === 'one-time') {
            price = modalItem.price_per_delivery;
        } else {
            const result = getDiscountedPrice(deliveriesPerMonth, subscriptionMonths, modalItem.price_per_delivery);
            price = result.finalTotal;
            discountPercent = result.discountPercent;
        }

        const newItem = {
            id: modalItem.id,
            product_id: modalItem.id,
            title: modalItem.title,
            deliveriesPerMonth: modalMode === 'one-time' ? 1 : deliveriesPerMonth,
            subscriptionMonths: modalMode === 'one-time' ? 1 : subscriptionMonths,
            price,
            photos: modalItem.photos,
            quantity: 1,
            deliveryDate: modalMode === 'one-time' ? deliveryDate : undefined,
            size: undefined,
            type: modalMode,
            discountPercent: modalMode === 'subscription' ? discountPercent : undefined,
        };
        addToCart(newItem);
        closeModal();
        if (onGoToCart) onGoToCart();
    };

    const formatPrice = (price: number) => {
        return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const handleSetModalMode = (mode: 'subscription' | 'one-time') => {
        setModalMode(mode);
        if (mode === 'subscription' && error === 'Пожалуйста, выберите дату доставки.') {
            setError('');
        }
    };

    return (
        <div className="menu-container">
            <div className="menu-header">
                <div className="category-buttons">
                    <button
                        className={`category-button ${activeCategory === 'bouquets' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('bouquets')}
                    >Букеты
                    </button>
                    <button
                        className={`category-button ${activeCategory === 'fresh' ? 'active' : ''}`}
                        onClick={() => setActiveCategory('fresh')}
                    >Свежие цветы
                    </button>
                </div>
            </div>
            {loading ? (
                <div className="loading-products">
                </div>
            ) : (
                <div className="cards-container">
                    {items.map(item => (
                        <div key={item.id} className="item-card">
                            <div className="item-image-container" onClick={() => openModal(item)}>
                                {item.photos && item.photos[0] ? (
                                    <img src={item.photos[0]} alt={item.title} className="cart-item-image"/>
                                ) : (
                                    <div className="cart-item-no-image">Нет фото</div>
                                )}
                                {item.photos.length > 1 && (
                                    <div className="slider-indicators">
                                        {item.photos.map((_, idx) => (
                                            <span key={idx} className={`indicator ${idx === 0 ? 'active' : ''}`}/>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="item-content">
                                <h2 className="item-title">{item.title}{item.size ? ` (${item.size})` : ''}</h2>
                                <p className="item-description">{item.description}</p>
                                <button className="select-button" onClick={() => openModal(item)}>Выбрать</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modalItem && (
                <div className="modal-overlay active">
                    <div className="modal-content new-design">
                        <button className="modal-close" onClick={closeModal}>×</button>
                        <div className="modal-gallery" onTouchStart={handleModalTouchStart} onTouchEnd={handleModalTouchEnd}>
                            <img src={modalItem.photos[modalImageIndex]} alt={`${modalItem.title} ${modalImageIndex + 1}`} className="modal-image"/>
                            {modalItem.photos.length > 1 && (
                                <>
                                    <button className="modal-nav-button prev" onClick={() => handleModalImageNav('prev')}>←</button>
                                    <button className="modal-nav-button next" onClick={() => handleModalImageNav('next')}>→</button>
                                    <div className="slider-indicators">
                                        {modalItem.photos.map((_, idx) => (
                                            <span key={idx} className={`indicator ${idx === modalImageIndex ? 'active' : ''}`}/>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-block modal-main">
                            <h2 className="modal-title">{modalItem.title}</h2>
                            <p className="modal-description">{modalItem.description}</p>
                        </div>
                        <div className="modal-block modal-type-row">
                            <div className="modal-label">Тип заказа:</div>
                            <div className="type-row">
                                <button className={`type-row-btn${modalMode === 'subscription' ? ' active' : ''}`} style={{ width: '50%', marginRight: '6px' }}
                                        onClick={() => handleSetModalMode('subscription')}>
                                    Подписка
                                </button>
                                <button className={`type-row-btn${modalMode === 'one-time' ? ' active' : ''}`} style={{ width: '50%' }}
                                        onClick={() => handleSetModalMode('one-time')}>
                                    Один заказ
                                </button>
                            </div>
                        </div>
                        {modalMode === 'one-time' ? (
                            <div className="modal-block modal-onetime">
                                <label className="modal-label">Дата доставки:</label>
                                <input type="date"
                                       value={deliveryDate}
                                       min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                                       max={new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)}
                                       onChange={e => setDeliveryDate(e.target.value)}
                                       className="modal-input"/>
                                <div className="modal-price-block">
                                    <span className="modal-price-label">Стоимость:</span>
                                    <span className="modal-price-value">
                    {formatPrice(modalItem.price_per_delivery)} ₽
                  </span>
                                </div>
                            </div>
                        ) : (
                            <div className="modal-block modal-subscription">
                                <div className="modal-row">
                                    <label className="modal-label">Доставок в месяц:</label>
                                    <select
                                        value={deliveriesPerMonth}
                                        onChange={e => setDeliveriesPerMonth(Number(e.target.value))}
                                        className="modal-select"
                                        disabled={modalItem.max_deliveries === 1}
                                    >
                                        {Array.from({ length: modalItem.max_deliveries }, (_, i) => i + 1).map(count => (
                                            <option key={count} value={count}>{count}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-row">
                                    <label className="modal-label">Количество месяцев:</label>
                                    <select
                                        value={subscriptionMonths}
                                        onChange={e => setSubscriptionMonths(Number(e.target.value))}
                                        className="modal-select"
                                        disabled={modalItem.max_months === 1}
                                    >
                                        {Array.from({ length: modalItem.max_months }, (_, i) => i + 1).map(count => (
                                            <option key={count} value={count}>{count}</option>
                                        ))}
                                    </select>
                                </div>
                                {/* Ряд: расчет стоимости слева, итоговые цены справа, скидка снизу */}
                                <div className="modal-price-block"
                                     style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', gap: 16 }}>
                                    {/* Слева расчет */}
                                    <div style={{ fontSize: 15, color: '#555' }}>
                                        <div>
                                            Стоимость: {formatPrice(modalItem.price_per_delivery)} × {deliveriesPerMonth * subscriptionMonths}
                                        </div>
                                    </div>
                                    {/* Справа итоговые цены */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 90 }}>
                                        {(() => {
                                            const {
                                                discountPercent,
                                                originalTotal,
                                                finalTotal
                                            } = getDiscountedPrice(deliveriesPerMonth, subscriptionMonths, modalItem.price_per_delivery);
                                            return (
                                                <>
                                                    {discountPercent > 0 && finalTotal < originalTotal ? (
                                                        <>
                              <span style={{ textDecoration: 'line-through', color: '#888', fontSize: 14 }}>
                                {formatPrice(originalTotal)} ₽
                              </span>
                                                            <span className="modal-price-value" style={{ fontWeight: 600, fontSize: 20, color: '#222' }}>
                                {formatPrice(finalTotal)} ₽
                              </span>
                                                        </>
                                                    ) : (
                                                        <span className="modal-price-value" style={{ fontWeight: 600, fontSize: 20, color: '#222' }}>
                              {formatPrice(originalTotal)} ₽
                            </span>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* Снизу текст про скидку */}
                                {(() => {
                                    const { discountPercent } = getDiscountedPrice(deliveriesPerMonth, subscriptionMonths, modalItem.price_per_delivery);
                                    if (discountPercent > 0) {
                                        return (
                                            <div style={{ fontSize: 14, color: '#888', marginTop: 6 }}>
                                                Скидка {discountPercent}% за количество букетов
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}
                        {error && <div className="modal-error">{error}</div>}
                        <button className="modal-cart-btn" onClick={addToCartHandler}>В корзину</button>
                    </div>
                </div>
            )}
        </div>
    );
}