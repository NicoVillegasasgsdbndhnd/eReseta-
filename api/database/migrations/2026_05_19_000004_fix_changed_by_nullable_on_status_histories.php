<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment_status_histories', function (Blueprint $table): void {
            $table->dropForeign(['changed_by']);
            $table->unsignedBigInteger('changed_by')->nullable()->change();
            $table->foreign('changed_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointment_status_histories', function (Blueprint $table): void {
            $table->dropForeign(['changed_by']);
            $table->unsignedBigInteger('changed_by')->nullable(false)->change();
            $table->foreign('changed_by')->references('id')->on('users');
        });
    }
};
