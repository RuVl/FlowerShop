// app/types/telegram.d.ts
interface TelegramWebApp {
    initData: string;

    openLink(confirmation_url: any): unknown;
}

interface Window {
    Telegram?: {
        WebApp?: TelegramWebApp;
    };
}