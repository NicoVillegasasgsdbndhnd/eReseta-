<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Admin-managed catalog of diagnostic/laboratory tests a doctor can order (mentor review).
 * Mirrors the medicines catalog + `is_available` pattern; admin can add/remove/toggle entries.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_tests', function (Blueprint $table): void {
            $table->id();
            $table->string('name')->unique();             // unique enables seeder upsert
            $table->string('category')->nullable();        // imaging / laboratory / other
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_tests');
    }
};
