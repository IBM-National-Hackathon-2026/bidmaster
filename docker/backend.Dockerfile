FROM php:8.3-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev unzip git \
 && docker-php-ext-install pdo pdo_sqlite pcntl \
 && rm -rf /var/lib/apt/lists

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader
COPY backend/ ./
COPY knowledge/ /knowledge/

RUN mkdir -p database && touch database/database.sqlite \
 && cp .env.example .env && php artisan key:generate \
 && php artisan migrate --force \
 && php artisan db:seed --force

EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
