<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;






return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prescription_items', function (Blueprint $table): void {
            $table->foreignId('medicine_id')->nullable()->after('drug_name')->constrained()->nullOnDelete();
            $table->foreignId('dispensed_brand_id')->nullable()->after('dispensed_quantity')->constrained('medicine_brands')->nullOnDelete();
            $table->string('dispensed_brand_name')->nullable()->after('dispensed_brand_id');
        });
    }

    public function down(): void
    {
        Schema::table('prescription_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('medicine_id');
            $table->dropConstrainedForeignId('dispensed_brand_id');
            $table->dropColumn('dispensed_brand_name');
        });
    }
};
