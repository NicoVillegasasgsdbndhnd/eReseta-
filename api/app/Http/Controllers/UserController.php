<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\StaffRequest;
use App\Models\User;
use App\Notifications\AccountProvisioned;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $viewer = $request->user();
        $isAdmin = $viewer->hasRole('admin');
        $isDoctorViewingOwnStaff = $viewer->hasRole('doctor') && $request->role === 'staff';

        abort_if(! $isAdmin && ! $isDoctorViewingOwnStaff, 403, 'Only administrators can view users.');

        $users = User::with('roles', 'doctor', 'assignedDoctor.user', 'staffRequest')
            ->whereDoesntHave('roles', fn ($r) => $r->where('name', 'patient'))
            ->when($isDoctorViewingOwnStaff, fn ($q) =>
                $q->where('assigned_doctor_id', $viewer->doctor?->id)
            )
            ->when($request->role, fn ($q, $role) =>
                $q->whereHas('roles', fn ($r) => $r->where('name', $role))
            )
            ->when($request->search, fn ($q, $s) =>
                $q->where(fn ($inner) =>
                    $inner->where('name', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%")
                )
            )
            ->latest()
            ->paginate(20);

        return UserResource::collection($users);
    }

    public function store(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can create users.');

        $data = $request->validate([
            'name'               => ['required', 'string', 'max:255'],
            'email'              => ['required', 'email', 'unique:users,email'],
            // Optional: when omitted, a strong temporary password is generated and the
            // account is forced to change it on first login (must_change_password).
            'password'           => ['nullable', Password::min(8)->mixedCase()->numbers()->symbols()],
            'role'               => ['required', 'in:patient,doctor,pharmacist,admin,staff'],
            'phone'              => ['nullable', 'string', 'max:20'],
            'address'            => ['nullable', 'string'],
            // Doctor-specific
            'specialization'     => ['required_if:role,doctor', 'nullable', 'string', 'max:255'],
            'license_no'         => ['required_if:role,doctor', 'nullable', 'string', 'max:50'],
            'prc_expiry'         => ['required_if:role,doctor', 'nullable', 'date'],
            // Staff-specific
            'assigned_doctor_id' => ['required_if:role,staff', 'nullable', 'exists:doctors,id'],
        ] + self::doctorRules());

        // Account provisioning: an admin may set a password, or leave it blank to have the
        // system generate a temporary one and force a change on first login.
        $tempPassword  = empty($data['password']) ? Str::password(12) : null;
        $plainPassword = $tempPassword ?? $data['password'];

        $user = DB::transaction(function () use ($data, $plainPassword, $tempPassword): User {
            $user = User::create([
                'name'                 => $data['name'],
                'email'                => $data['email'],
                'password'             => Hash::make($plainPassword),
                'phone'                => $data['phone'] ?? null,
                'address'              => $data['address'] ?? null,
                'assigned_doctor_id'   => $data['assigned_doctor_id'] ?? null,
                'must_change_password' => $tempPassword !== null,
            ]);
            $user->assignRole($data['role']);

            if ($data['role'] === 'doctor') {
                Doctor::create([
                    'user_id'        => $user->id,
                    'specialization' => $data['specialization'],
                    'license_no'     => $data['license_no'],
                    'prc_expiry'     => $data['prc_expiry'],
                ] + self::doctorAttributes($data));
            }

            if ($data['role'] === 'patient') {
                Patient::create(['user_id' => $user->id]);
            }

            if ($data['role'] === 'staff' && ! empty($data['assigned_doctor_id'])) {
                StaffRequest::create([
                    'staff_user_id' => $user->id,
                    'doctor_id'     => $data['assigned_doctor_id'],
                    'status'        => 'pending',
                ]);
            }

            return $user;
        });

        if ($tempPassword !== null) {
            try {
                $user->notify(new AccountProvisioned($tempPassword));
            } catch (\Throwable $e) {
                report($e); // best-effort — never block account creation on mail failure
            }
        }

        return response()->json([
            ...(new UserResource($user->load('assignedDoctor.user', 'staffRequest')))->resolve($request),
            // Returned ONLY when generated, for the admin's one-time on-screen credential modal.
            'temp_password' => $tempPassword,
        ], 201);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can delete users.');
        abort_if($user->id === $request->user()->id, 403, 'You cannot delete your own account.');

        $user->delete();

        return response()->json(null, 204);
    }

    public function update(Request $request, User $user): UserResource
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can update users.');

        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'email'          => ['sometimes', 'email', "unique:users,email,{$user->id}"],
            'phone'          => ['nullable', 'string', 'max:20'],
            'address'        => ['nullable', 'string'],
            'status'         => ['sometimes', 'in:active,inactive'],
            'role'           => ['sometimes', 'in:patient,doctor,pharmacist,admin,staff'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'license_no'     => ['nullable', 'string', 'max:50'],
            'prc_expiry'     => ['nullable', 'date'],
        ] + self::doctorRules());

        // Prevent an admin from locking themselves out (deactivating or demoting self).
        if ($user->id === $request->user()->id) {
            abort_if(($data['status'] ?? null) === 'inactive', 403, 'You cannot deactivate your own account.');
            abort_if(isset($data['role']) && $data['role'] !== 'admin', 403, 'You cannot change your own role.');
        }

        $user->update(array_intersect_key($data, array_flip(['name', 'email', 'phone', 'address', 'status'])));

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        // Revoke active sessions when an account is deactivated so access ends immediately.
        if (($data['status'] ?? null) === 'inactive') {
            $user->tokens()->delete();
        }

        $targetRole = $data['role'] ?? $user->getRoleNames()->first();

        if ($targetRole === 'doctor') {
            Doctor::updateOrCreate(
                ['user_id' => $user->id],
                array_filter([
                    'specialization' => $data['specialization'] ?? null,
                    'license_no'     => $data['license_no'] ?? null,
                    'prc_expiry'     => $data['prc_expiry'] ?? null,
                ] + self::doctorAttributes($data), fn ($v) => $v !== null)
            );
        }

        return new UserResource($user->fresh(['doctor', 'assignedDoctor.user', 'staffRequest']));
    }

    /** Validation rules for the optional doctor credentialing fields (mentor add-user spec). */
    private static function doctorRules(): array
    {
        return [
            'ptr_no'                         => ['nullable', 'string', 'max:50'],
            's2_license'                     => ['nullable', 'string', 'max:50'],
            'signature'                      => ['nullable', 'string', 'max:1000'],
            'suffix'                         => ['nullable', 'string', 'max:20'],
            'gender'                         => ['nullable', 'in:male,female,other'],
            'date_of_birth'                  => ['nullable', 'date'],
            'corporate_email'                => ['nullable', 'email', 'max:255'],
            'secure_phone'                   => ['nullable', 'string', 'max:20'],
            'secretary_phone'                => ['nullable', 'string', 'max:20'],
            'clinic_email'                   => ['nullable', 'email', 'max:255'],
            'trunkline_ext'                  => ['nullable', 'string', 'max:20'],
            'philhealth_accreditation'       => ['nullable', 'string', 'max:50'],
            'tin'                            => ['nullable', 'string', 'max:30'],
            'hospital_department'            => ['nullable', 'string', 'max:100'],
            'consultant_type'                => ['nullable', 'string', 'max:50'],
            'clinic_room_no'                 => ['nullable', 'string', 'max:50'],
            'medical_society_affiliations'   => ['nullable', 'array'],
            'medical_society_affiliations.*' => ['string', 'max:100'],
            'hmo_partners'                   => ['nullable', 'array'],
            'hmo_partners.*'                 => ['string', 'max:100'],
            'clinic_available_days'          => ['nullable', 'array'],
            'clinic_available_days.*'        => ['string', 'max:20'],
            'consultation_fee'               => ['nullable', 'numeric', 'min:0'],
            'followup_fee'                   => ['nullable', 'numeric', 'min:0'],
            'inpatient_fee'                  => ['nullable', 'numeric', 'min:0'],
            'er_referral_fee'                => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /** Pluck the doctor credentialing attributes that were supplied in the request. */
    private static function doctorAttributes(array $data): array
    {
        $keys = [
            'ptr_no', 's2_license', 'signature', 'suffix', 'gender', 'date_of_birth',
            'corporate_email', 'secure_phone', 'secretary_phone', 'clinic_email', 'trunkline_ext',
            'philhealth_accreditation', 'tin', 'hospital_department', 'consultant_type',
            'clinic_room_no', 'medical_society_affiliations', 'hmo_partners',
            'clinic_available_days', 'consultation_fee', 'followup_fee', 'inpatient_fee',
            'er_referral_fee',
        ];

        return array_intersect_key($data, array_flip($keys));
    }
}
