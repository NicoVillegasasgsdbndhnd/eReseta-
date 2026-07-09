<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Resources\PatientResource;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\PatientAccountActivation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PatientController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        abort_if($user->hasRole('patient') || $user->hasRole('pharmacist'), 403, 'Unauthorized.');

        $patients = Patient::with('user')
            ->when($request->search, fn ($q, $search) =>
                $q->whereHas('user', fn ($u) =>
                    $u->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                )
            )
            ->latest()
            ->paginate(20);

        return PatientResource::collection($patients);
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        abort_if(
            ! $request->user()->hasRole('admin') && ! $request->user()->hasRole('staff'),
            403,
            'Only administrators or staff can register patients.'
        );



        $needsActivation = ! $request->filled('password');
        $plainPassword   = $request->password ?? Str::password(32);

        ['patient' => $patient, 'user' => $user] = DB::transaction(function () use ($request, $plainPassword): array {
            $user = User::create([
                'name'                 => User::combineName($request->first_name, $request->middle_name, $request->last_name),
                'first_name'           => $request->first_name,
                'middle_name'          => $request->middle_name,
                'last_name'            => $request->last_name,
                'email'                => $request->email,
                'password'             => $plainPassword,
                'phone'                => $request->phone,


                'must_change_password' => true,
            ]);
            $user->assignRole('patient');

            $patient = Patient::create([
                'user_id'       => $user->id,
                'dob'           => $request->dob,
                'sex'           => $request->sex,
                'address'       => $request->address,
                'philhealth_no' => $request->philhealth_no,
                'contact'       => $request->contact,
                ...$request->only([
                    'preferred_language', 'known_allergies', 'gov_id_type', 'gov_id_no',
                    'hmo_provider', 'hmo_policy_no', 'hmo_group_no', 'copay',
                    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
                ]),
            ]);


            if ($request->filled('appointment_id')) {
                Appointment::where('id', $request->appointment_id)
                    ->whereNull('patient_id')
                    ->update(['patient_id' => $patient->id]);
            }

            return ['patient' => $patient, 'user' => $user];
        });

        if ($needsActivation) {
            try {
                $user->notify(new PatientAccountActivation(Password::createToken($user)));
            } catch (\Throwable $e) {
                report($e); // best-effort — never block account creation on mail failure
            }
        }

        return response()->json([
            ...(new PatientResource($patient->load('user')))->resolve($request),

            'activation_sent' => $needsActivation,
        ], 201);
    }

    public function show(Request $request, Patient $patient): PatientResource
    {
        $user = $request->user();
        abort_if($user->hasRole('pharmacist'), 403, 'Unauthorized.');
        if ($user->hasRole('patient')) {
            abort_if($patient->user_id !== $user->id, 403, 'You can only view your own profile.');
        }

        return new PatientResource($patient->load('user'));
    }

    public function update(UpdatePatientRequest $request, Patient $patient): PatientResource
    {
        abort_if(
            ! $request->user()->hasRole('admin') && ! $request->user()->hasRole('staff'),
            403,
            'Only administrators or staff can update patients.'
        );
        DB::transaction(function () use ($request, $patient): void {
            $userUpdates = $request->only('email', 'phone');
            if ($request->hasAny(['first_name', 'middle_name', 'last_name'])) {
                $first  = $request->input('first_name', $patient->user->first_name);
                $middle = $request->input('middle_name', $patient->user->middle_name);
                $last   = $request->input('last_name', $patient->user->last_name);
                $userUpdates += [
                    'first_name'  => $first,
                    'middle_name' => $middle,
                    'last_name'   => $last,
                    'name'        => User::combineName($first, $middle, $last),
                ];
            }
            if ($userUpdates !== []) {
                $patient->user->update($userUpdates);
            }

            $patient->update($request->only(
                'dob', 'sex', 'address', 'philhealth_no', 'contact',
                'preferred_language', 'known_allergies', 'gov_id_type', 'gov_id_no',
                'hmo_provider', 'hmo_policy_no', 'hmo_group_no', 'copay',
                'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
            ));
        });

        return new PatientResource($patient->fresh('user'));
    }

    public function destroy(Request $request, Patient $patient): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can delete patients.');

        $patient->user->delete();

        return response()->json(null, 204);
    }
}
