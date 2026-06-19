<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_order_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('diagnostic_order_id')->constrained()->cascadeOnDelete();
            // Nullable FK to the catalog; test_name is the free-text fallback (mirrors drug_name).
            $table->foreignId('diagnostic_test_id')->nullable()->constrained()->nullOnDelete();
            $table->string('test_name');
            $table->string('clinical_reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_order_items');
    }
};
