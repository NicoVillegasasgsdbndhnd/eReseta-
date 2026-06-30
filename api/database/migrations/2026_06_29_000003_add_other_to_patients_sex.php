<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Extend the enum to include 'other'. Only MySQL/MariaDB have a real ENUM type; the SQLite
        // test DB stores it as a CHECK-constrained string (tests use male/female only), and the
        // allowed values are governed by the application-layer validation regardless.
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            // Normalize any NULL/empty/invalid sex first (e.g. patient-role accounts created
            // without intake data) so the stricter NOT NULL enum modify doesn't fail (error 1138).
            DB::statement("UPDATE patients SET sex = 'male' WHERE sex IS NULL OR sex NOT IN ('male', 'female')");
            DB::statement("ALTER TABLE patients MODIFY COLUMN sex ENUM('male', 'female', 'other') NOT NULL");
        }
    }

    public function down(): void
    {
        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement("ALTER TABLE patients MODIFY COLUMN sex ENUM('male', 'female') NOT NULL");
        }
    }
};
