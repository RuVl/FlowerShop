import React from 'react';
import './About.css';

export function About() {
    return (
        <div className="about-container">
            <p className="about-desc">
                <span className="about-bold">Soin</span> — это сервис регулярной доставки свежих цветов домой или в офис.
                Вы выбираете подходящий тариф, и мы привозим вам новый букет или свежие цветы — просто, удобно и красиво!
            </p>

            <div className="about-policy">
                <h2 className="about-policy-title">Политика согласий</h2>
                <ul className="about-policy-list">
                    <li>
                        <a
                            href="https://drive.google.com/file/d/1IS5B_lp6cQz5hk51qaMVGAUN_-jfQeR4/view"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="about-link"
                        >
                            Согласие на обработку персональных данных
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://drive.google.com/file/d/1hisYTNenLLkm616qwO5Jbpx88U3etdmt/view"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="about-link"
                        >
                            Согласие на получение рассылки и рекламных материалов
                        </a>
                    </li>
                </ul>
            </div>

            <div className="about-contacts">
                <h2 className="about-contacts-title">Контакты</h2>
                <div className="about-contacts-list">
                    <div><span className="about-bold">Название:</span> ИП Василенко А.И.</div>
                    <div><span className="about-bold">ОГРНИП/ИНН:</span> 3325774600560198 / 503127112988</div>
                    <div>
                        <span className="about-bold">Email:</span>{' '}
                        <a href="mailto:info@soinshop.ru" className="about-link">info@soinshop.ru</a>
                    </div>
                    <div>
                        <span className="about-bold">Телефон:</span>{' '}
                        <a href="tel:+79932735415" className="about-link">+7 (993) 273-54-15</a>
                    </div>
                    <div><span className="about-bold">Адрес:</span> г. Москва, ул. Шоссе Энтузиастов 10/2</div>
                </div>
            </div>
        </div>
    );
}