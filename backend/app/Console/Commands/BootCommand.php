<?php

namespace App\Console\Commands;

use App\Models\Member;
use Illuminate\Console\Command;

/**
 * Menyiapkan aplikasi dalam SATU bootstrap: migrasi, seed (bila perlu), lalu
 * cache config/route/view. Sebelumnya tiap langkah dipanggil sebagai proses
 * artisan terpisah sehingga membayar biaya bootstrap Laravel berulang kali
 * (memperlambat start container).
 */
class BootCommand extends Command
{
    protected $signature = 'app:boot';

    protected $description = 'Migrasi + seed + cache (config/route/view) dalam satu proses.';

    public function handle(): int
    {
        // WAJIB: bersihkan cache LAMA lebih dulu. Tanpa ini, `config:cache`
        // menulis ulang config yang sedang dimuat — yaitu nilai dari cache lama —
        // sehingga config yang basi/tercemar akan terus-menerus dipertahankan
        // (self-perpetuating). Contoh nyata: DB_DATABASE basi membuat aplikasi
        // menunjuk file sqlite yang salah.
        $this->call('config:clear');
        $this->call('route:clear');
        $this->call('view:clear');

        $this->call('migrate', ['--force' => true]);

        // Seed hanya bila belum ada anggota (idempoten, hemat waktu start).
        if (Member::query()->doesntExist()) {
            $this->call('db:seed', ['--force' => true]);
        } else {
            $this->info('Seed dilewati (data admin sudah ada).');
        }

        $this->call('config:cache');
        $this->call('route:cache');
        $this->call('view:cache');

        $this->info('Aplikasi siap.');

        return self::SUCCESS;
    }
}
