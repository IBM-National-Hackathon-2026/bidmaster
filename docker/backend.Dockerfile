FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-dev libzip-dev unzip git \
 && docker-php-ext-install pdo pdo_sqlite pcntl zip \
 && rm -rf /var/lib/apt/lists

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# OPcache: aktifkan untuk CLI server (php -S) agar file tidak dikompilasi ulang
# tiap request. Tanpa ini, setiap request membayar biaya compile penuh.
# validate_timestamps=0 aman karena kode di-bake ke image (bukan bind-mount).
RUN { \
      echo 'opcache.enable=1'; \
      echo 'opcache.enable_cli=1'; \
      echo 'opcache.memory_consumption=192'; \
      echo 'opcache.interned_strings_buffer=16'; \
      echo 'opcache.max_accelerated_files=20000'; \
      echo 'opcache.validate_timestamps=0'; \
      echo 'opcache.save_comments=1'; \
      echo 'realpath_cache_size=4096K'; \
      echo 'realpath_cache_ttl=600'; \
    } > /usr/local/etc/php/conf.d/zz-opcache.ini

WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --no-scripts
COPY backend/ ./
COPY knowledge/ /knowledge/

RUN mkdir -p database && touch database/database.sqlite \
  && cp .env.example .env && php artisan key:generate \
  && php artisan package:discover

EXPOSE 8000
# Siapkan aplikasi dalam SATU bootstrap (migrate+seed+cache) lalu jalankan
# server dengan beberapa worker (pcntl) supaya request lambat (analisis/Bob)
# tidak memblokir request lain. PHP_CLI_SERVER_WORKERS butuh ekstensi pcntl.
CMD ["sh", "-c", "php artisan app:boot && PHP_CLI_SERVER_WORKERS=${PHP_CLI_SERVER_WORKERS:-8} php -S 0.0.0.0:8000 -t public"]
