<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescriptions', function (Blueprint $table): void {
            $table->id();
            $table->string('reference_no', 30)->unique();
            $table->foreignId('patient_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->dateTime('issued_at');
            $table->enum('status', ['issued', 'verified', 'dispensed', 'expired'])->default('issued');
            $table->string('blockchain_tx_id')->nullable();
            $table->timestamps();

            $table->index(['doctor_id', 'status']);
            $table->index('patient_record_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescriptions');
    }
};
