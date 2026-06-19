<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Doctor leave / blocked dates (mentor review 2026-06-18): a doctor or their staff
 * can "X out" a date when the doctor is unavailable, blocking new bookings that day.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doctor_leaves', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->date('date');
            $table->string('reason')->nullable();
            $table->timestamps();

            $table->unique(['doctor_id', 'date']);
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doctor_leaves');
    }
};
