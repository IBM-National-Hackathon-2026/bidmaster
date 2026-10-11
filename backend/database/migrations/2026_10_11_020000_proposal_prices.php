<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposals', function (Blueprint $t) {
            $t->text('prices')->default('[]');
            $t->text('discount')->default('[]');
        });
    }

    public function down(): void
    {
        Schema::table('proposals', function (Blueprint $t) {
            $t->dropColumn(['prices', 'discount']);
        });
    }
};
