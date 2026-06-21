<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

// Procedures & Surgeries was removed — there's no consultation flow to record one,
// so the feature (and its table) is dropped. dropIfExists makes this a no-op on
// fresh installs that never created it.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('procedures');
    }

    public function down(): void
    {
        // Intentionally empty — the procedures feature was removed.
    }
};
