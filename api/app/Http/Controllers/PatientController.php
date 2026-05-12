<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class PatientController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
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
        $patient = DB::transaction(function () use ($request): Patient {
            $user = User::create([
                'name'     => $request->name,
                'email'    => $request->email,
                'password' => $request->password,
                'phone'    => $request->phone,
            ]);
            $user->assignRole('patient');

            return Patient::create([
                'user_id'       => $user->id,
                'dob'           => $request->dob,
                'sex'           => $request->sex,
                'address'       => $request->address,
                'philhealth_no' => $request->philhealth_no,
                'contact'       => $request->contact,
            ]);
        });

        return response()->json(new PatientResource($patient->load('user')), 201);
    }

    public function show(Patient $patient): PatientResource
    {
        return new PatientResource($patient->load('user'));
    }

    public function update(UpdatePatientRequest $request, Patient $patient): PatientResource
    {
        DB::transaction(function () use ($request, $patient): void {
            if ($request->hasAny(['name', 'email', 'phone'])) {
                $patient->user->update($request->only('name', 'email', 'phone'));
            }

            $patient->update($request->only('dob', 'sex', 'address', 'philhealth_no', 'contact'));
        });

        return new PatientResource($patient->fresh('user'));
    }

    public function destroy(Patient $patient): JsonResponse
    {
        $patient->user->delete();

        return response()->json(null, 204);
    }
}
