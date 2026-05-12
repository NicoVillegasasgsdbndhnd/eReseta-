<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditObserver
{
    public function created(Model $model): void
    {
        $this->log('CREATE', $model);
    }

    public function updated(Model $model): void
    {
        $this->log('UPDATE', $model);
    }

    public function deleted(Model $model): void
    {
        $this->log('DELETE', $model);
    }

    private function log(string $action, Model $model): void
    {
        if (! Auth::check()) {
            return;
        }

        AuditLog::create([
            'user_id'     => Auth::id(),
            'action'      => $action,
            'target_type' => class_basename($model),
            'target_id'   => $model->getKey() ?? 0,
            'ip_address'  => Request::ip() ?? '127.0.0.1',
        ]);
    }
}
