<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            // Structured name. `name` stays the canonical combined display value; these hold the
            // parts so forms can edit them cleanly. Nullable so existing rows stay valid.
            $table->string('first_name', 120)->nullable()->after('name');
            $table->string('middle_name', 120)->nullable()->after('first_name');
            $table->string('last_name', 120)->nullable()->after('middle_name');
            // Gender for staff-side accounts (doctor/staff/pharmacist/admin). Patients keep `sex`
            // on the patients table.
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['first_name', 'middle_name', 'last_name', 'gender']);
        });
    }
};
