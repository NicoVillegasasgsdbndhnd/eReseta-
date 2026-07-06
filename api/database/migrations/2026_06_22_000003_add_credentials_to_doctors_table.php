<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;




return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {

            $table->string('suffix')->nullable()->after('specialization');          // MD / DO / DDS / PhD
            $table->string('gender')->nullable()->after('suffix');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('corporate_email')->nullable()->after('date_of_birth');
            $table->string('secure_phone')->nullable()->after('corporate_email');
            $table->string('secretary_phone')->nullable()->after('secure_phone');
            $table->string('clinic_email')->nullable()->after('secretary_phone');
            $table->string('trunkline_ext')->nullable()->after('clinic_email');
            $table->string('profile_photo')->nullable()->after('trunkline_ext');     // file path (Phase 3)


            $table->string('philhealth_accreditation')->nullable()->after('s2_license'); // PAN
            $table->string('tin')->nullable()->after('philhealth_accreditation');        // ADMIN-only


            $table->string('hospital_department')->nullable()->after('tin');
            $table->string('consultant_type')->nullable()->after('hospital_department');
            $table->string('clinic_room_no')->nullable()->after('consultant_type');
            $table->json('medical_society_affiliations')->nullable()->after('clinic_room_no');
            $table->json('hmo_partners')->nullable()->after('medical_society_affiliations');
            $table->json('clinic_available_days')->nullable()->after('hmo_partners');


            $table->decimal('consultation_fee', 10, 2)->nullable()->after('clinic_available_days');
            $table->decimal('followup_fee', 10, 2)->nullable()->after('consultation_fee');
            $table->decimal('inpatient_fee', 10, 2)->nullable()->after('followup_fee'); // STAFF/ADMIN
            $table->decimal('er_referral_fee', 10, 2)->nullable()->after('inpatient_fee'); // STAFF/ADMIN
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropColumn([
                'suffix', 'gender', 'date_of_birth', 'corporate_email', 'secure_phone',
                'secretary_phone', 'clinic_email', 'trunkline_ext', 'profile_photo',
                'philhealth_accreditation', 'tin', 'hospital_department', 'consultant_type',
                'clinic_room_no', 'medical_society_affiliations', 'hmo_partners',
                'clinic_available_days', 'consultation_fee', 'followup_fee',
                'inpatient_fee', 'er_referral_fee',
            ]);
        });
    }
};
