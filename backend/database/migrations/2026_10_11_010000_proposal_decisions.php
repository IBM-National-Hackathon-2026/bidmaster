<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proposals', function (Blueprint $t) {
            $t->text('decisions')->default('{}');
            $t->text('approvals')->default('[]');
            $t->text('req_units')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('proposals', function (Blueprint $t) {
            $t->dropColumn(['decisions', 'approvals', 'req_units']);
        });
    }
};
