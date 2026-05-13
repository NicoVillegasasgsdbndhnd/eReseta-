<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\Doctor;
use App\Models\Patient;
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
        $users = User::with('roles', 'doctor')
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
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'email'          => ['required', 'email', 'unique:users,email'],
            'password'       => ['required', Password::min(8)],
            'role'           => ['required', 'in:patient,doctor,pharmacist,admin,it_admin'],
            'phone'          => ['nullable', 'string', 'max:20'],
            'address'        => ['nullable', 'string'],
            // Doctor-specific
            'specialization' => ['required_if:role,doctor', 'nullable', 'string', 'max:255'],
            'license_no'     => ['required_if:role,doctor', 'nullable', 'string', 'max:50'],
            'prc_expiry'     => ['required_if:role,doctor', 'nullable', 'date'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => Hash::make($data['password']),
                'phone'    => $data['phone'] ?? null,
                'address'  => $data['address'] ?? null,
            ]);
            $user->assignRole($data['role']);

            if ($data['role'] === 'doctor') {
                Doctor::create([
                    'user_id'        => $user->id,
                    'specialization' => $data['specialization'],
                    'license_no'     => $data['license_no'],
                    'prc_expiry'     => $data['prc_expiry'],
                ]);
            }

            if ($data['role'] === 'patient') {
                Patient::create(['user_id' => $user->id]);
            }

            return $user;
        });

        return response()->json(new UserResource($user), 201);
    }

    public function update(Request $request, User $user): UserResource
    {
        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'email'          => ['sometimes', 'email', "unique:users,email,{$user->id}"],
            'phone'          => ['nullable', 'string', 'max:20'],
            'address'        => ['nullable', 'string'],
            'status'         => ['sometimes', 'in:active,inactive'],
            'role'           => ['sometimes', 'in:patient,doctor,pharmacist,admin,it_admin'],
            'specialization' => ['nullable', 'string', 'max:255'],
            'license_no'     => ['nullable', 'string', 'max:50'],
            'prc_expiry'     => ['nullable', 'date'],
        ]);

        $user->update(array_intersect_key($data, array_flip(['name', 'email', 'phone', 'address', 'status'])));

        if (isset($data['role'])) {
            $user->syncRoles([$data['role']]);
        }

        $targetRole = $data['role'] ?? $user->getRoleNames()->first();

        if ($targetRole === 'doctor') {
            Doctor::updateOrCreate(
                ['user_id' => $user->id],
                array_filter([
                    'specialization' => $data['specialization'] ?? null,
                    'license_no'     => $data['license_no'] ?? null,
                    'prc_expiry'     => $data['prc_expiry'] ?? null,
                ], fn ($v) => $v !== null)
            );
        }

        return new UserResource($user->fresh('doctor'));
    }
}
