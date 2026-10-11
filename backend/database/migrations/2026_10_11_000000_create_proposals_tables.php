<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proposals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $t->string('instansi', 80)->default('');
            $t->string('jenis_instansi', 40)->default('Pemerintahan');
            $t->bigInteger('pagu')->nullable();
            $t->integer('durasi_minggu')->default(12);
            $t->string('req_nama', 80)->default('');
            $t->mediumText('req_teks')->default('');
            $t->string('req_satuan', 10)->default('baris');
            $t->integer('req_jumlah')->default(0);
            $t->text('pendukung')->default('[]');
            $t->text('items')->default('[]');
            $t->string('status', 20)->default('draf');
            $t->integer('current_version')->default(0);
            $t->timestamps();
        });
        Schema::create('proposal_versions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('proposal_id')->constrained('proposals')->cascadeOnDelete();
            $t->integer('versi');
            $t->text('snapshot');
            $t->timestamps();
            $t->unique(['proposal_id', 'versi']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proposal_versions');
        Schema::dropIfExists('proposals');
    }
};
