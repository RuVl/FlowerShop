import React, { useEffect, useState } from 'react';
import { Navbar } from '~/components/Navbar';
import { Menu } from '~/components/pages/Menu';
import { Cart } from '~/components/pages/Cart';
import { About } from '~/components/pages/About';
import { Profile } from '~/components/pages/Profile'; // новый импорт
import { AuthComponent } from '~/components/AuthComponent';
import { CartProvider } from '~/components/pages/CartContext';
import { PaymentSuccess } from '~/components/pages/PaymentSuccess';

export function Welcome() {
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'about' | 'profile'>('menu');
    const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            if (window.location.pathname.includes("payment-success")) {
                setIsPaymentSuccess(true);
            }
        }
    }, []);

    const renderContent = () => {
        if (isPaymentSuccess) {
            return <PaymentSuccess onBack={() => (window.location.href = "/")}/>;
        }

        switch (activeTab) {
            case 'menu':
                return <Menu onGoToCart={() => setActiveTab('cart')}/>;
            case 'cart':
                return <Cart/>;
            case 'about':
                return <About/>;
            case 'profile':
                return <Profile/>;
            default:
                return <Menu onGoToCart={() => setActiveTab('cart')}/>;
        }
    };

    return (
        <CartProvider>
            <main className="min-h-screen bg-white flex flex-col items-center  pt-[50px] pb-[70px]">
                <AuthComponent>
                    {renderContent()}
                </AuthComponent>
                {!isPaymentSuccess && <Navbar onTabChange={setActiveTab}/>}
            </main>
        </CartProvider>
    );
}