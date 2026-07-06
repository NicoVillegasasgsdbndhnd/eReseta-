<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;






return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diagnostic_tests', function (Blueprint $table): void {
            $table->string('modality')->nullable()->after('category');
            $table->string('body_region')->nullable()->after('modality');
        });
    }

    public function down(): void
    {
        Schema::table('diagnostic_tests', function (Blueprint $table): void {
            $table->dropColumn(['modality', 'body_region']);
        });
    }
};
