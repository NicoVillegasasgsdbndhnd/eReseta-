<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Appointments created before reference numbers existed have a NULL reference.
     * Number them per year, continuing after any references already issued for that year.
     */
    public function up(): void
    {
        $rows = DB::table('appointments')
            ->whereNull('reference_no')
            ->orderBy('id')
            ->get(['id', 'created_at']);

        $sequences = [];

        foreach ($rows as $row) {
            $year = $row->created_at ? (int) date('Y', strtotime((string) $row->created_at)) : (int) date('Y');

            if (! isset($sequences[$year])) {
                $sequences[$year] = DB::table('appointments')
                    ->where('reference_no', 'like', "APT-{$year}-%")
                    ->count();
            }

            $sequences[$year]++;

            DB::table('appointments')
                ->where('id', $row->id)
                ->update(['reference_no' => sprintf('APT-%d-%04d', $year, $sequences[$year])]);
        }
    }

    public function down(): void
    {
        // Backfilled data is not meaningfully reversible: dropping the column (in the
        // migration that added it) is the rollback path.
    }
};
