<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiagnosticTest extends Model
{
    protected $fillable = ['name', 'category', 'modality', 'body_region', 'is_available'];

    protected function casts(): array
    {
        return [
            'is_available' => 'boolean',
        ];
    }
}
