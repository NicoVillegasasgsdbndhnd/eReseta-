<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Mentor revision — restricted / "break-glass" clinical data. A patient record can be flagged
// with a sensitive category (mental health, genetic, substance abuse, VIP, patient-requested) and
// optionally scoped to a specialization. Such records are filtered OUT of the main timeline and
// only revealed to a matching specialist or via an audited break-glass override.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->string('restriction_category')->nullable()->after('notes');
            $table->string('restricted_specialization')->nullable()->after('restriction_category');
        });

        // Free-text context for an audit entry (e.g. the break-glass justification).
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->string('context', 255)->nullable()->after('ip_address');
        });
    }

    public function down(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->dropColumn(['restriction_category', 'restricted_specialization']);
        });
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropColumn('context');
        });
    }
};
