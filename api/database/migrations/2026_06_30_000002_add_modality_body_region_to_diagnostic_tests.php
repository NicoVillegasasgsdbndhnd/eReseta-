<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Imaging tests carry a modality (X-Ray, Ultrasound, ECG…) and an anatomical area so the doctor's
 * "Order a test" UI can cascade Modality → Area → filtered list instead of one long flat menu.
 * Null for laboratory tests (they keep the plain search).
 */
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
