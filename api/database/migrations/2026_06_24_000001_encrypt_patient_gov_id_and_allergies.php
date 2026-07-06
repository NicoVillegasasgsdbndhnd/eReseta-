<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;












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
