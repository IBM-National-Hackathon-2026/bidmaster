<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('members', function (Blueprint $t) {
            $t->id();
            $t->string('nama', 40)->unique();
            $t->string('peran', 20);
            $t->string('password', 255);
        });
        Schema::create('api_tokens', function (Blueprint $t) {
            $t->string('token', 64)->primary();
            $t->foreignId('member_id')->constrained('members')->cascadeOnDelete();
            $t->integer('expires_at');
        });
        Schema::create('audits', function (Blueprint $t) {
            $t->id();
            $t->integer('ts');
            $t->foreignId('member_id')->nullable()->constrained('members')->nullOnDelete();
            $t->string('aksi', 40);
            $t->string('detail', 500)->default('');
            $t->index(['member_id', 'ts']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
        Schema::dropIfExists('api_tokens');
        Schema::dropIfExists('members');
    }
};
