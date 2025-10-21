import React from 'react';
import LogoIcon from '/assets/icons/logo.svg';

export function Header() {
    return (
        <header className="fixed inset-x-0 top-0 h-[60px] z-[1000] bg-[#ffffff]  flex justify-center items-center">
            <div className="flex items-center justify-center">
                <img
                    src={LogoIcon}
                    alt="Логотип"
                    height={80}
                    width={100}
                />
            </div>
        </header>
    );
}   