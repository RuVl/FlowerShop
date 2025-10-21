import React from "react";
import { CheckCircle } from "lucide-react";

interface Props {
    onBack: () => void;
}

export function PaymentSuccess({ onBack }: Props) {
    return (
        <div className="flex flex-col items-center justify-center text-center mt-16 px-6">
            <CheckCircle className="text-green-500 w-20 h-20 mb-6"/>
            <h2 className="text-2xl font-bold text-green-600 mb-3">
                Оплата прошла успешно!
            </h2>
            <p className="text-gray-700 mb-8">
                Спасибо за ваш заказ. Мы скоро свяжемся с вами для подтверждения доставки.
            </p>
            <button
                onClick={onBack}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition"
            >
                Вернуться на главную
            </button>
        </div>
    );
}
