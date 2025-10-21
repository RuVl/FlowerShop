import React, { useState } from 'react';
import HomeIcon from '/assets/icons/home.svg';
import BasketIcon from '/assets/icons/basket.svg';
import AboutIcon from '/assets/icons/about.svg';
import UserIcon from '/assets/icons/user.svg'; // Новый импорт

interface NavbarProps {
    onTabChange: (tab: 'menu' | 'cart' | 'about' | 'profile') => void;
}

export function Navbar({ onTabChange }: NavbarProps) {
    const [activeTab, setActiveTab] = useState<'menu' | 'cart' | 'about' | 'profile'>('menu');

    const navButtons = [
        { key: 'menu', icon: HomeIcon, label: 'Меню' },
        { key: 'cart', icon: BasketIcon, label: 'Корзина' },
        { key: 'profile', icon: UserIcon, label: 'Профиль' }, // Новая вкладка
        { key: 'about', icon: AboutIcon, label: 'О проекте' },
    ];

    const handleTabClick = (tab: 'menu' | 'cart' | 'about' | 'profile') => {
        setActiveTab(tab);
        onTabChange(tab);
    };

    return (
        <>
            <nav className="fixed inset-x-0 bottom-4 z-[1000] bg-[#ffffff] border-t border-gray-300 flex justify-around items-center h-[60px]">
                {navButtons.map((button) => (
                    <button
                        key={button.key}
                        className={`flex flex-col items-center justify-center h-full w-[25%] ${activeTab === button.key ? 'bg-[#ffffff]' : ''}`}
                        onClick={() => handleTabClick(button.key as any)}
                    >
                        <img
                            src={button.icon}
                            alt={button.label}
                            height={22}
                            width={22}
                            className="w-8 h-8"
                        />
                        <span className={`text-[10px] ${activeTab === button.key ? 'text-black' : 'text-gray-800'}`}>
              {button.label}
            </span>
                    </button>
                ))}
            </nav>
            <div className="fixed inset-x-0 bottom-0 h-[16px] bg-[#ffffff] z-[1000]"/>
        </>
    );
}