FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev libzip-dev unzip git \
 && docker-php-ext-install pdo pdo_sqlite pcntl zip \
 && rm -rf /var/lib/apt/lists

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --no-scripts
COPY backend/ ./
COPY knowledge/ /knowledge/

RUN mkdir -p database && touch database/database.sqlite \
 && cp .env.example .env && php artisan key:generate \
 && php artisan package:discover

EXPOSE 8000
# Migrasi saat start (bukan build) agar volume lama ikut diperbarui.
# php -S langsung (bukan artisan serve) agar env container utuh.
CMD ["sh", "-c", "php artisan migrate --force && php artisan db:seed --force && php -S 0.0.0.0:8000 -t public"]
