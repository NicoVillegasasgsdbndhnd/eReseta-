<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_requests', function (Blueprint $table): void {
            $table->id();
            $table->string('reference_no', 30)->unique();
            $table->string('full_name', 255);
            $table->date('dob');
            $table->enum('sex', ['male', 'female']);
            $table->string('mobile', 30);
            $table->string('email', 255);
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->dateTime('preferred_date');
            $table->text('reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'declined', 'cancelled'])->default('pending');
            $table->foreignId('appointment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('decline_reason')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['doctor_id', 'preferred_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_requests');
    }
};
