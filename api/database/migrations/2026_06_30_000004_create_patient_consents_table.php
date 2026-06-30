<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RA 10173 (Data Privacy Act) consent — the lawful basis (Sec. 13a) for a NON-doctor (staff/admin)
 * to access a patient's clinical record. Doctors rely on the treatment basis (Sec. 13e) instead.
 * Append-only history: the patient's current consent is the latest row; withdrawal is a new row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_consents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->enum('status', ['given', 'withdrawn']);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete(); // staff/doctor/admin
            $table->string('consent_version')->default('v1');
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index(['patient_id', 'recorded_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_consents');
    }
};
