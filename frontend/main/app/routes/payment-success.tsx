import type { Route } from "./+types/payment-success";
import React from "react";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Оплата прошла успешно" },
        { name: "description", content: "Спасибо за заказ!" },
    ];
}

export default function PaymentSuccess() {
    return (
        <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
            <div className="text-6xl mb-6">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-3">
                Оплата прошла успешно!
            </h2>
            <p className="text-gray-700 mb-8">
                Спасибо за ваш заказ. Мы скоро свяжемся с вами для подтверждения доставки.
            </p>
            <a
                href="/"
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition"
            >
                Вернуться на главную
            </a>
        </div>
    );
}
