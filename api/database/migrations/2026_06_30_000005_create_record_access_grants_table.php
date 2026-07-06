<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;






return new class extends Migration
{
    public function up(): void
    {
        Schema::create('record_access_grants', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('patient_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_user_id')->constrained('users')->cascadeOnDelete(); // the overriding doctor
            $table->text('reason');
            $table->timestamp('granted_at')->useCurrent();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['patient_id', 'doctor_user_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('record_access_grants');
    }
};
