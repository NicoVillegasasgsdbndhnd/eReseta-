<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Brand-level catalog (DEAMHI's real inventory). The catalog is generic-first: a doctor prescribes
 * a generic (medicines), and the pharmacist resolves it to one of its available brands here.
 * Sourced from the hospital's HIS export; strength/form/packaging are parsed per brand.
 */
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
