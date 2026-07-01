<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * First-login Terms & Privacy acceptance (RA 10173). Stores which version each user accepted;
 * when the app's current TERMS_VERSION is newer, the user is forced to re-accept on next login.
 * The full acceptance evidence (who/when/IP) is written to the audit log.
 */
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
