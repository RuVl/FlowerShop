# --- build stage ---
FROM node:lts-slim AS build
WORKDIR /app

# Убеждаемся, что devDependencies не будут пропущены
ENV NODE_ENV=development

# Устанавливаем зависимости (включая dev)
COPY package*.json ./
RUN npm ci

# Копируем исходники
COPY . .

# Билдим проект
RUN npx react-router build

# --- runtime stage ---
FROM node:lts-slim AS runtime
WORKDIR /app

# Только прод-зависимости
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем билд из предыдущей стадии
COPY --from=build /app/build ./build

EXPOSE 3000

# Запуск
ENTRYPOINT ["npm", "run", "start"]
