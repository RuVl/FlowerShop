FROM nginx:1.29.2
LABEL authors="RuVl"

# Copy certs files
COPY ./certs /etc/nginx/certs

# Copy the nginx configuration file
COPY ./soinshop.conf /etc/nginx/conf.d/default.conf

# Touch log files for nginx
RUN mkdir -p /usr/www/logs && touch /usr/www/logs/nginx_access.log /usr/www/logs/nginx_error.log

# Start nginx to serve the application (in foreground)
ENTRYPOINT ["nginx", "-g", "daemon off;"]