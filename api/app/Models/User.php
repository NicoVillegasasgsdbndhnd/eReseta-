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
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected $fillable = [
        'name', 'first_name', 'middle_name', 'last_name', 'gender',
        'email', 'password', 'phone', 'address', 'status', 'profile_photo_path',
        'assigned_doctor_id', 'must_change_password',
    ];

    /** Build the canonical combined `name` from its parts (skips a blank middle name). */
    public static function combineName(?string $first, ?string $middle, ?string $last): string
    {
        return trim(implode(' ', array_filter([
            trim((string) $first),
            trim((string) $middle),
            trim((string) $last),
        ], fn ($part) => $part !== '')));
    }

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at'    => 'datetime',
            'password'             => 'hashed',
            'status'               => UserStatus::class,
            'must_change_password' => 'boolean',
            'terms_accepted_at'    => 'datetime',
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

    /** The doctor this staff member is assigned to. */
    public function assignedDoctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class, 'assigned_doctor_id');
    }

    /** Staff users assigned to this doctor (via users.assigned_doctor_id → doctors.id). */
    public function staffMembers(): HasMany
    {
        return $this->hasMany(User::class, 'assigned_doctor_id', 'doctor.id');
    }

    public function staffRequest(): HasOne
    {
        return $this->hasOne(StaffRequest::class, 'staff_user_id');
    }

    /**
     * Override the framework default so the reset link points at the React SPA
     * (/reset-password) rather than a non-existent backend `password.reset` route.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new \App\Notifications\ResetPasswordNotification($token));
    }
}
