<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Mentor review 2026-06-18: drop the `emergency` appointment type.
 * Any existing emergency rows are converted to `consultation` first so the
 * tightened enum can apply. SQLite (test DB) has no real ENUM, so the raw
 * ALTER only runs on MySQL/MariaDB; the data conversion runs on both.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('appointments')->where('type', 'emergency')->update(['type' => 'consultation']);

        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN type ENUM('consultation', 'follow_up') NOT NULL DEFAULT 'consultation'");
        }
    }

    public function down(): void
    {
        if (in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN type ENUM('consultation', 'follow_up', 'emergency') NOT NULL DEFAULT 'consultation'");
        }
    }
};
