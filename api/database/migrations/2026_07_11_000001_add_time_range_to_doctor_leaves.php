<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Idempotent: a previous run may have added the columns before failing on the
        // index drop below, so guard the adds to allow a clean re-run.
        Schema::table('doctor_leaves', function (Blueprint $table): void {
            // Null start/end = whole-day leave (backward compatible). Set = partial (per-hour) leave.
            if (! Schema::hasColumn('doctor_leaves', 'start_time')) {
                $table->time('start_time')->nullable()->after('date');
            }
            if (! Schema::hasColumn('doctor_leaves', 'end_time')) {
                $table->time('end_time')->nullable()->after('start_time');
            }
        });

        // The doctor_id FK relied on the composite unique (doctor_id, date) as its
        // supporting index. MariaDB refuses to drop an index a FK needs, so give the FK
        // its own index first, THEN drop the unique (allows multiple partial leaves/day).
        Schema::table('doctor_leaves', function (Blueprint $table): void {
            $table->index('doctor_id');
            $table->dropUnique(['doctor_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('doctor_leaves', function (Blueprint $table): void {
            // Restore the composite unique first (re-supports the FK), then drop the
            // standalone doctor_id index and the added columns.
            $table->unique(['doctor_id', 'date']);
            $table->dropIndex(['doctor_id']);
            $table->dropColumn(['start_time', 'end_time']);
        });
    }
};
