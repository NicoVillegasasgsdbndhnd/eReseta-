<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Make personal detail columns nullable — admins create patient accounts
        // before all profile info is known; doctors fill these in later.
        Schema::table('patients', function (Blueprint $table): void {
            $table->date('dob')->nullable()->change();
            $table->enum('sex', ['male', 'female'])->nullable()->change();
            $table->string('address')->nullable()->change();
            $table->string('contact', 20)->nullable()->change();
        });

        // Backfill a patients row for every patient-role user that doesn't have one.
        DB::statement("
            INSERT INTO patients (user_id, created_at, updated_at)
            SELECT u.id, NOW(), NOW()
            FROM users u
            INNER JOIN model_has_roles mhr
                ON mhr.model_id = u.id
               AND mhr.model_type = 'App\\\\Models\\\\User'
            INNER JOIN roles r ON r.id = mhr.role_id AND r.name = 'patient'
            LEFT JOIN patients p ON p.user_id = u.id
            WHERE p.id IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->date('dob')->nullable(false)->change();
            $table->enum('sex', ['male', 'female'])->nullable(false)->change();
            $table->string('address')->nullable(false)->change();
            $table->string('contact', 20)->nullable(false)->change();
        });
    }
};
