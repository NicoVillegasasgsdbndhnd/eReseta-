<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescription_items', function (Blueprint $table): void {
            // The amount ACTUALLY dispensed to the patient (partial dispensing). The doctor's
            // ordered `quantity` is never changed; this records reality (0 ≤ dispensed ≤ quantity).
            // Null until the prescription is dispensed.
            $table->unsignedSmallInteger('dispensed_quantity')->nullable()->after('quantity_unit');
        });
    }

    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table): void {
            $table->dropColumn('dispensed_quantity');
        });
    }
};
