# FlowerShop

[![Ask DeepWiki](https://devin.ai/assets/askdeepwiki.png)](https://deepwiki.com/RuVl/FlowerShop)

FlowerShop is a comprehensive, full-stack e-commerce platform for a flower delivery service. It is designed to operate seamlessly within Telegram, featuring a customer-facing Mini App, an administrative dashboard for management, and a notification-driven Telegram bot.

## Features

### Customer-Facing (Telegram Mini App)
- **Product Catalog:** Browse a catalog of bouquets and fresh flowers.
- **Shopping Cart:** Add desired products to a personal shopping cart.
- **Subscription & One-Time Orders:** Flexibility to place single orders or subscribe for regular deliveries.
- **Secure Payments:** Integrated with Yookassa for reliable and secure payment processing.
- **User Profile:** View personal order history and manage subscriptions.

### Admin Panel
- **Dashboard:** At-a-glance view of key metrics including total users, orders, and revenue.
- **User Management:** View, search, block/unblock, and manage the balance of users.
- **Product Management:** Full CRUD (Create, Read, Update, Delete) functionality for all products in the catalog.
- **Order Management:** Track and update order statuses, and manage subscription delivery schedules.
- **Broadcast System:** Send custom messages (with optional media and buttons) to all users or a specific user.
- **Marketing & Analytics:** Create and track unique `start_param` links to monitor the conversion funnel from different advertising sources.

### Telegram Bot
- **User Onboarding:** Seamless registration process via Telegram's native phone number sharing.
- **Deep Linking:** Supports `start_param` for tracking user acquisition channels.
- **Customer Support:** A dedicated support feature that forwards user questions to a private admin group.
- **Notifications:** Proactively sends notifications to users about order status changes, successful payments, and admin broadcasts via a Redis pub/sub channel.

## Architecture

The application is built on a microservices architecture, orchestrated with Docker Compose.

- **Nginx:** Acts as a reverse proxy, directing traffic to the frontend and backend services based on the domain.
- **Frontend (Main):** A React-based Telegram Mini App for customers.
- **Frontend (Admin Panel):** A React and Material-UI dashboard for shop administration.
- **Backend:** A FastAPI (Python) service that provides a RESTful API for products, users, orders, and payments.
- **Telegram Bot:** An `aiogram`-based bot that handles user interaction and notifications.
- **PostgreSQL:** The primary relational database for storing all application data.
- **Redis:** Used as a message broker for the notification system between the backend and the Telegram bot.

## Tech Stack

- **Backend:** Python, FastAPI, SQLAlchemy, Alembic
- **Frontend:** React, TypeScript, Vite, Tailwind CSS (Main App), Material-UI (Admin Panel)
- **Telegram Bot:** Python, `aiogram`
- **Database:** PostgreSQL
- **Cache/Message Broker:** Redis
- **Web Server:** Nginx
- **Containerization:** Docker, Docker Compose

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### 1. Configuration

The project uses `.env` files for configuration. You must create these files from the `.env.dist` templates located in each service directory.

Navigate to the following directories and copy the `.env.dist` file to a new file named `.env` (or `dev.env` for development):

- `backend/`
- `frontend/main/`
- `frontend/admin_panel/`
- `postgres/`
- `redis/`
- `telegram_bot/`

After creating the files, open each one and fill in the required values, such as your `TG_API_TOKEN`, `YOOKASSA_SHOP_ID`, database credentials, and domain URLs.

### 2. Running in Production

1.  **Build and Run Containers:**
    Use the main `docker-compose.yml` file to build and start all services in detached mode.

    ```bash
    docker compose up -d --build
    ```

2.  **Database Migration:**
    After the services start, apply the database migrations.

    ```bash
    docker compose exec backend alembic revision --autogenerate && alembic upgrade head
    ```

3.  **Create an Admin User:**
    To access the admin panel, create an administrator account. The script will generate and print a secure password for you.

    ```bash
    docker compose exec backend python3 -m scripts.add_admin -U <username> -E <email>
    ```
    Save the generated password. You can now log in to the admin panel at your configured domain (e.g., `https://admin.soinshop.ru`).

### 3. Running in Development

The development environment uses `dev-docker-compose.yml` which enables features like hot-reloading for the frontend services.

1.  **Build and Run Containers:**
    Specify the `dev-docker-compose.yml` file to start the services.

    ```bash
    docker compose -f dev-docker-compose.yml up --build
    ```

2.  **Database Migration & Admin Creation:**
    In a separate terminal, run the same commands as in production to prepare the database and create an admin user.

    ```bash
    # Apply migrations
    docker compose -f dev-docker-compose.yml exec backend alembic revision --autogenerate &&  alembic upgrade head

    # Create admin
    docker compose -f dev-docker-compose.yml exec backend python3 -m scripts.add_admin -U <username> -E <email>
    ```
    The services will be available at the ports defined in `dev-docker-compose.yml` (e.g., `http://localhost:3000` for the main app and `http://localhost:3001` for the admin panel).