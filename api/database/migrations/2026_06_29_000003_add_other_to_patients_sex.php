<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {



        if (in_array(DB::connection()->getDriverName(), ['mysql', 'mariadb'], true)) {


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
