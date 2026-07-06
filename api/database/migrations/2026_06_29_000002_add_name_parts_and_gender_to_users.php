<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {


            $table->string('first_name', 120)->nullable()->after('name');
            $table->string('middle_name', 120)->nullable()->after('first_name');
            $table->string('last_name', 120)->nullable()->after('middle_name');


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
