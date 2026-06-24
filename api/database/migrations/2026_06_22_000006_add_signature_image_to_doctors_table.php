<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Future-work item realized: an uploaded signature IMAGE (scanned / transparent PNG) for the
// doctor, rendered on the Hospital Rx. The existing `signature` column keeps the typed e-signature
// as a fallback when no image is uploaded.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->string('signature_image')->nullable()->after('signature');
        });
    }

    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table): void {
            $table->dropColumn('signature_image');
        });
    }
};
