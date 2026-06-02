<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Encrypt patient PII at rest (RA 10173 / ISO 27701).
 *
 * address, contact, philhealth_no become application-encrypted (random IV), so VARCHAR
 * columns are widened to TEXT and the old unique index on philhealth_no is replaced by a
 * deterministic blind index (philhealth_no_hash) to keep uniqueness enforceable.
 *
 * Backfill is idempotent: values that already decrypt are left untouched, so this is safe
 * on a fresh DB (seeders run after, already encrypted by the cast) and on an existing DB.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->dropUnique(['philhealth_no']);
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->text('address')->nullable()->change();
            $table->text('contact')->nullable()->change();
            $table->text('philhealth_no')->nullable()->change();
            $table->char('philhealth_no_hash', 64)->nullable()->after('philhealth_no');
        });

        $key = config('app.key');

        DB::table('patients')->orderBy('id')->chunk(100, function ($rows) use ($key) {
            foreach ($rows as $row) {
                $update = [];

                foreach (['address', 'contact'] as $field) {
                    if ($row->$field !== null && ! $this->isEncrypted($row->$field)) {
                        $update[$field] = Crypt::encryptString($row->$field);
                    }
                }

                if ($row->philhealth_no !== null) {
                    $plain = $this->tryDecrypt($row->philhealth_no);

                    if (! $this->isEncrypted($row->philhealth_no)) {
                        $update['philhealth_no'] = Crypt::encryptString($row->philhealth_no);
                    }

                    $update['philhealth_no_hash'] = hash_hmac('sha256', $plain, $key);
                }

                if ($update !== []) {
                    DB::table('patients')->where('id', $row->id)->update($update);
                }
            }
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->unique('philhealth_no_hash');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table): void {
            $table->dropUnique(['philhealth_no_hash']);
        });

        DB::table('patients')->orderBy('id')->chunk(100, function ($rows) {
            foreach ($rows as $row) {
                $update = [];

                foreach (['address', 'contact', 'philhealth_no'] as $field) {
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
            $table->dropColumn('philhealth_no_hash');
            $table->string('address')->nullable()->change();
            $table->string('contact', 20)->nullable()->change();
            $table->string('philhealth_no', 30)->nullable()->change();
        });

        Schema::table('patients', function (Blueprint $table): void {
            $table->unique('philhealth_no');
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
