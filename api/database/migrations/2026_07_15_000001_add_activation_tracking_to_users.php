<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestamp('activation_sent_at')->nullable()->after('must_change_password');
            $table->timestamp('activated_at')->nullable()->after('activation_sent_at');
            $table->timestamp('activation_expired_notified_at')->nullable()->after('activated_at');
            $table->timestamp('reactivation_requested_at')->nullable()->after('activation_expired_notified_at');
        });

        // Legacy patients who already set their own password (no longer must change it) count as
        // activated, so the status shows "Activated" rather than an unknown state.
        DB::table('users')
            ->where('must_change_password', false)
            ->whereNull('activated_at')
            ->update(['activated_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'activation_sent_at', 'activated_at',
                'activation_expired_notified_at', 'reactivation_requested_at',
            ]);
        });
    }
};
