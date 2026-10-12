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
