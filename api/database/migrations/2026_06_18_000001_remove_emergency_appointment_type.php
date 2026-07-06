<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;







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
