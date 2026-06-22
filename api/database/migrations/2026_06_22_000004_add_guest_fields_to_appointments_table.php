<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A guest appointment exists before the patient has an account, so patient_id is
        // nullable and the appointment carries a self-contained snapshot of the guest's
        // name/contact (survives request archival; keeps calendar lookups human-readable).
        Schema::table('appointments', function (Blueprint $table): void {
            $table->unsignedBigInteger('patient_id')->nullable()->change();
            $table->foreignId('appointment_request_id')->nullable()->after('patient_id')
                  ->constrained()->nullOnDelete();
            $table->string('guest_name', 255)->nullable()->after('appointment_request_id');
            $table->string('guest_contact', 30)->nullable()->after('guest_name');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('appointment_request_id');
            $table->dropColumn(['guest_name', 'guest_contact']);
            $table->unsignedBigInteger('patient_id')->nullable(false)->change();
        });
    }
};
