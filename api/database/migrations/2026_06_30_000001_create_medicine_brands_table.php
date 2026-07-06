<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;






return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicine_brands', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('medicine_id')->constrained()->cascadeOnDelete();
            $table->string('brand_name');
            $table->string('hospital_code')->nullable()->index();  // HIS barcode (MED00xxx)
            $table->string('strength')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('packaging')->nullable();               // e.g. "Box of 100"
            $table->boolean('is_available')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicine_brands');
    }
};
