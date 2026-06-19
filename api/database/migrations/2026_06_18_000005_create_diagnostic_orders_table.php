<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A doctor's request for diagnostic test(s) on a visit — its own document, separate from the
 * medication prescription (research spike, Appendix A). Off-chain; simple lifecycle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_orders', function (Blueprint $table): void {
            $table->id();
            $table->string('reference_no')->unique();
            $table->foreignId('patient_record_id')->constrained()->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained()->cascadeOnDelete();
            $table->dateTime('ordered_at');
            $table->string('status')->default('ordered');  // ordered / completed / cancelled
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['patient_record_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_orders');
    }
};
