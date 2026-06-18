<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\StaffRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can view users.');

        $users = User::with('roles', 'doctor', 'assignedDoctor.user', 'staffRequest')
            ->whereDoesntHave('roles', fn ($r) => $r->where('name', 'patient'))
            ->when($request->role, fn ($q, $role) =>
                $q->whereHas('roles', fn ($r) => $r->where('name', $role))
            )
            ->when($request->search, fn ($q, $s) =>
                $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")
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
            'password'           => ['required', Password::min(8)->mixedCase()->numbers()->symbols()],
            'role'               => ['required', 'in:patient,doctor,pharmacist,admin,staff'],
            'phone'              => ['nullable', 'string', 'max:20'],
            'address'            => ['nullable', 'string'],
            // Doctor-specific
            'specialization'     => ['required_if:role,doctor', 'nullable', 'string', 'max:255'],
            'license_no'         => ['required_if:role,doctor', 'nullable', 'string', 'max:50'],
            'prc_expiry'         => ['required_if:role,doctor', 'nullable', 'date'],
            'ptr_no'             => ['nullable', 'string', 'max:50'],
            's2_license'         => ['nullable', 'string', 'max:50'],
            'signature'          => ['nullable', 'string', 'max:1000'],
            // Staff-specific
            'assigned_doctor_id' => ['required_if:role,staff', 'nullable', 'exists:doctors,id'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'name'               => $data['name'],
                'email'              => $data['email'],
                'password'           => Hash::make($data['password']),
                'phone'              => $data['phone'] ?? null,
                'address'            => $data['address'] ?? null,
                'assigned_doctor_id' => $data['assigned_doctor_id'] ?? null,
            ]);
            $user->assignRole($data['role']);

            if ($data['role'] === 'doctor') {
                Doctor::create([
                    'user_id'        => $user->id,
                    'specialization' => $data['specialization'],
                    'license_no'     => $data['license_no'],
                    'prc_expiry'     => $data['prc_expiry'],
                    'ptr_no'         => $data['ptr_no'] ?? null,
                    's2_license'     => $data['s2_license'] ?? null,
                    'signature'      => $data['signature'] ?? null,
                ]);
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

        return response()->json(new UserResource($user->load('assignedDoctor.user', 'staffRequest')), 201);
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
            'ptr_no'         => ['nullable', 'string', 'max:50'],
            's2_license'     => ['nullable', 'string', 'max:50'],
            'signature'      => ['nullable', 'string', 'max:1000'],
        ]);

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
                    'ptr_no'         => $data['ptr_no'] ?? null,
                    's2_license'     => $data['s2_license'] ?? null,
                    'signature'      => $data['signature'] ?? null,
                ], fn ($v) => $v !== null)
            );
        }

        return new UserResource($user->fresh(['doctor', 'assignedDoctor.user', 'staffRequest']));
    }
}
