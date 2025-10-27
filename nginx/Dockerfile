FROM nginx:1.29.2
LABEL authors="RuVl"

# SSL
RUN apt update && apt install python3-certbot-nginx cron -y

# Add script for renew SSL
COPY ./certbot-renew.sh /usr/local/bin/certbot-renew.sh
RUN chmod +x /usr/local/bin/certbot-renew.sh

# Add crontab job
COPY ./cronjob /etc/cron.d/certbot-renew
RUN crontab /etc/cron.d/certbot-renew

# Copy the nginx configuration file
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./soinshop.conf /etc/nginx/conf.d/default.conf

# Touch log files for nginx
RUN mkdir -p /usr/www/logs && touch /usr/www/logs/nginx_access.log /usr/www/logs/nginx_error.log

# Start nginx to serve the application (in foreground)
ENTRYPOINT ["/bin/bash", "-c", "cron && nginx -g 'daemon off;'"]

# Once container created - generate SSL certificates inside container:
# certbot --nginx -d app.soinshop.ru -d admin.soinshop.ru -d api.soinshop.ru --cert-name=soinshop.ru --email $DOMAIN_EMAIL --key-type rsa --agree-tos

# Check automatically renew SSL certs job:
# certbot renew --dry-run
