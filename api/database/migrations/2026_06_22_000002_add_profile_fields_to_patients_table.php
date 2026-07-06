<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;


return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table): void {

            $table->string('preferred_language', 60)->nullable()->after('sex');
            $table->string('known_allergies')->nullable()->after('preferred_language');

            $table->string('gov_id_type', 80)->nullable()->after('philhealth_no');
            $table->string('gov_id_no', 80)->nullable()->after('gov_id_type');
            $table->string('hmo_provider', 120)->nullable()->after('gov_id_no');
            $table->string('hmo_policy_no', 80)->nullable()->after('hmo_provider');
            $table->string('hmo_group_no', 80)->nullable()->after('hmo_policy_no');
            $table->string('copay')->nullable()->after('hmo_group_no');

            $table->string('emergency_contact_name', 120)->nullable()->after('copay');
            $table->string('emergency_contact_phone', 30)->nullable()->after('emergency_contact_name');
            $table->string('emergency_contact_relation', 60)->nullable()->after('emergency_contact_phone');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->dropColumn([
                'preferred_language', 'known_allergies', 'gov_id_type', 'gov_id_no',
                'hmo_provider', 'hmo_policy_no', 'hmo_group_no', 'copay',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
            ]);
        });
    }
};
