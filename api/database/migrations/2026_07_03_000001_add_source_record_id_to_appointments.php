<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a follow-up appointment back to the consultation (patient_record) that spawned it.
 * Nullable — most appointments have no source. Plain indexed column (no DB-level FK) so the
 * ALTER runs cleanly on SQLite in the test suite; referential integrity is handled in Eloquent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedBigInteger('source_record_id')->nullable()->after('type')->index();
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('source_record_id');
        });
    }
};
