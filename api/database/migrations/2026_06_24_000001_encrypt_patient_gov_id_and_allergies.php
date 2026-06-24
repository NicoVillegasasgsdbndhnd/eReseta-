<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Extend at-rest encryption to the remaining sensitive personal information (RA 10173 §3(l)):
 * gov_id_no (government-issued identifier) and known_allergies (health data). These were added
 * with the expanded intake profile after the original encrypt_patient_pii migration, so they
 * were still stored in plaintext — inconsistent with philhealth_no, which is encrypted.
 *
 * Columns are widened to TEXT (application-encrypted values with a random IV exceed the old
 * VARCHAR sizes) and existing plaintext values are encrypted in place. The backfill is
 * idempotent (values that already decrypt are left untouched), so it is safe on a fresh DB
 * (seeders run afterwards and are encrypted by the cast) and on an existing one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->text('gov_id_no')->nullable()->change();
            $table->text('known_allergies')->nullable()->change();
        });

        DB::table('patients')->orderBy('id')->chunk(100, function ($rows) {
            foreach ($rows as $row) {
                $update = [];

                foreach (['gov_id_no', 'known_allergies'] as $field) {
                    if ($row->$field !== null && $row->$field !== '' && ! $this->isEncrypted($row->$field)) {
                        $update[$field] = Crypt::encryptString($row->$field);
                    }
                }

                if ($update !== []) {
                    DB::table('patients')->where('id', $row->id)->update($update);
                }
            }
        });
    }

    public function down(): void
    {
        DB::table('patients')->orderBy('id')->chunk(100, function ($rows) {
            foreach ($rows as $row) {
                $update = [];

                foreach (['gov_id_no', 'known_allergies'] as $field) {
                    if ($row->$field !== null) {
                        $update[$field] = $this->tryDecrypt($row->$field);
                    }
                }

                if ($update !== []) {
                    DB::table('patients')->where('id', $row->id)->update($update);
                }
            }
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->string('gov_id_no', 80)->nullable()->change();
            $table->string('known_allergies')->nullable()->change();
        });
    }

    private function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    private function tryDecrypt(string $value): string
    {
        try {
            return Crypt::decryptString($value);
        } catch (\Throwable) {
            return $value;
        }
    }
};
