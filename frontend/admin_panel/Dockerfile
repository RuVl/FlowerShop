FROM node:lts-slim AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29.2

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Touch log files for nginx
RUN mkdir -p /usr/www/logs && touch /usr/www/logs/nginx_access.log /usr/www/logs/nginx_error.log

EXPOSE 3000

ENTRYPOINT ["nginx", "-g", "daemon off;"]
