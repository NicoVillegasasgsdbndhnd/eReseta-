<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;





return new class extends Migration
{
    public function up(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->string('brand_name')->nullable()->after('generic_name');
        });
    }

    public function down(): void
    {
        Schema::table('medicines', function (Blueprint $table): void {
            $table->dropColumn('brand_name');
        });
    }
};
