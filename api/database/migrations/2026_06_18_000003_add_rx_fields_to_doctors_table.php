<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Doctor details that print on the DEAMHI Hospital Rx (mentor review 2026-06-18):
 * PTR number, S2 (controlled-drug) license, and a signature line. All nullable/additive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->string('ptr_no')->nullable()->after('license_no');
            $table->string('s2_license')->nullable()->after('ptr_no');
            $table->string('signature')->nullable()->after('s2_license');
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropColumn(['ptr_no', 's2_license', 'signature']);
        });
    }
};
