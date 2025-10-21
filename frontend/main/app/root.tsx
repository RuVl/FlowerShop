// app/root.tsx
import React, { useEffect } from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { Header } from '~/components/Header';
import './app.css';

export const links = () => [
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
    },
    {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    },
    {
        rel: "script",
        href: "https://telegram.org/js/telegram-web-app.js",
        async: true,
    },
];

export default function App() {
    useEffect(() => {
        const preventPinchZoom = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventPinchZoom, { passive: false });

        return () => {
            document.removeEventListener('touchmove', preventPinchZoom);
        };
    }, []);

    return (
        <html lang="en">
        <head>
            <script src="https://telegram.org/js/telegram-web-app.js"></script>
            <meta charSet="utf-8"/>
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
            />
            <Meta/>
            <Links/>
        </head>
        <body>
        <Header/>
        <Outlet/>
        <ScrollRestoration/>
        <Scripts/>
        </body>
        </html>
    );
}