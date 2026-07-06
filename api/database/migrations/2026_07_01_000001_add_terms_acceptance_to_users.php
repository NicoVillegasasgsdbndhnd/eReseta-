<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;






return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('terms_accepted_version')->nullable()->after('must_change_password');
            $table->timestamp('terms_accepted_at')->nullable()->after('terms_accepted_version');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn(['terms_accepted_version', 'terms_accepted_at']);
        });
    }
};
