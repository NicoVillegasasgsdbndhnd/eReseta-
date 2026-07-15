<?php

namespace App\Models;

use App\Enums\UserStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{

    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name', 'first_name', 'middle_name', 'last_name', 'gender',
        'email', 'password', 'phone', 'address', 'status', 'profile_photo_path',
        'assigned_doctor_id', 'must_change_password',
        'activation_sent_at', 'activated_at', 'activation_expired_notified_at', 'reactivation_requested_at',
    ];


    public static function combineName(?string $first, ?string $middle, ?string $last): string
    {
        return trim(implode(' ', array_filter([
            trim((string) $first),
            trim((string) $middle),
            trim((string) $last),
        ], fn ($part) => $part !== '')));
    }

    protected $hidden = ['password', 'remember_token']; // password hidden from API responses

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed', // bcrypt hashing
            'status'               => UserStatus::class,
            'must_change_password' => 'boolean',
            'terms_accepted_at'    => 'datetime',
            'activation_sent_at'   => 'datetime',
            'activated_at'         => 'datetime',
            'activation_expired_notified_at' => 'datetime',
            'reactivation_requested_at'      => 'datetime',
        ];
    }

    /** When the current (unused) activation link expires, or null if activated / none sent. */
    public function activationExpiresAt(): ?\Illuminate\Support\Carbon
    {
        if ($this->activated_at !== null || $this->activation_sent_at === null) {
            return null;
        }

        return $this->activation_sent_at->copy()
            ->addMinutes((int) config('auth.passwords.activations.expire', 2880));
    }

    /** Status of the patient's account activation, for the staff UI. */
    public function activationSnapshot(): array
    {
        $expiresAt = $this->activationExpiresAt();
        $expired   = $expiresAt !== null && $expiresAt->isPast();

        return [
            'activated'                 => $this->activated_at !== null,
            'link_sent'                 => $this->activation_sent_at !== null,
            'expires_at'                => $expiresAt,
            'expired'                   => $expired,
            'hours_left'                => ($expiresAt && ! $expired) ? (int) ceil(now()->floatDiffInHours($expiresAt)) : 0,
            'reactivation_requested'    => $this->reactivation_requested_at !== null,
            'reactivation_requested_at' => $this->reactivation_requested_at,
        ];
    }

    public function patient(): HasOne
    {
        return $this->hasOne(Patient::class);
    }

    public function doctor(): HasOne
    {
        return $this->hasOne(Doctor::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }


    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'assigned_doctor_id');
    }


    public function staffMembers(): HasMany
    {
        return $this->hasMany(User::class, 'assigned_doctor_id', 'doctor.id');
    }

    public function staffRequest(): HasOne
    {
        return $this->hasOne(StaffRequest::class, 'staff_user_id');
    }





    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }
}
