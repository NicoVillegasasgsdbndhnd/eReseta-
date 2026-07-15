<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds structured Vital Signs and Physical Examination to the consultation record, mirroring
 * DEAMHI's paper Out-Patient form. Both are JSON (nullable) so the shape stays flexible:
 *   vital_signs  = { bp, cr, rr, temp, o2_sat, weight }
 *   physical_exam = { skin: {status, notes}, head: {status, notes}, ... }  (10 body systems)
 * Demographics are intentionally NOT duplicated here — they live once on the patient record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->json('vital_signs')->nullable()->after('chief_complaint');
            $table->json('physical_exam')->nullable()->after('vital_signs');
        });
    }

    public function down(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->dropColumn(['vital_signs', 'physical_exam']);
        });
    }
};
