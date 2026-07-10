<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_leaves', function (Blueprint $table): void {
            // Null start/end = whole-day leave (backward compatible). Set = partial (per-hour) leave.
            $table->time('start_time')->nullable()->after('date');
            $table->time('end_time')->nullable()->after('start_time');
            // Allow multiple partial leaves on the same day.
            $table->dropUnique(['doctor_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::table('doctor_leaves', function (Blueprint $table): void {
            $table->dropColumn(['start_time', 'end_time']);
            $table->unique(['doctor_id', 'date']);
        });
    }
};
