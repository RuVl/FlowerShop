#!/bin/bash

/usr/bin/certbot renew --quiet
/usr/sbin/nginx -s reload