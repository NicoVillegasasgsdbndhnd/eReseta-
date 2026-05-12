<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->enum('event_type', ['ISSUED', 'VERIFIED', 'DISPENSED']);
            $table->foreignId('actor_id')->constrained('users');
            $table->dateTime('occurred_at');
            $table->string('blockchain_tx_id')->nullable();
            $table->timestamps();

            $table->index('prescription_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_events');
    }
};
