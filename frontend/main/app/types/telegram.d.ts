// app/types/telegram.d.ts
interface TelegramWebApp {
    openLink(confirmation_url: any): unknown;
    initData: string;
}

interface Window {
    Telegram?: {
        WebApp?: TelegramWebApp;
    };
}