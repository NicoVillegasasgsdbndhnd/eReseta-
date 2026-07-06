<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;





return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->string('restriction_category')->nullable()->after('notes');
            $table->string('restricted_specialization')->nullable()->after('restriction_category');
        });


        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->string('context', 255)->nullable()->after('ip_address');
        });
    }

    public function down(): void
    {
        Schema::table('patient_records', function (Blueprint $table): void {
            $table->dropColumn(['restriction_category', 'restricted_specialization']);
        });
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropColumn('context');
        });
    }
};
