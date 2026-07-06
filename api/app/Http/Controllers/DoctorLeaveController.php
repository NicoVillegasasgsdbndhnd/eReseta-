<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorLeaveController extends Controller
{




    public function index(Doctor $doctor): JsonResponse
    {
        $leaves = $doctor->leaves()->orderBy('date')->get(['id', 'date', 'reason']);

        return response()->json(['data' => $leaves]);
    }


    public function store(Request $request, Doctor $doctor): JsonResponse
    {
        $this->authorizeManage($request->user(), $doctor);

        $validated = $request->validate([
            'date'   => ['required', 'date'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $leave = DoctorLeave::updateOrCreate(
            ['doctor_id' => $doctor->id, 'date' => $validated['date']],
            ['reason' => $validated['reason'] ?? null],
        );

        return response()->json(['data' => $leave->only('id', 'date', 'reason')], 201);
    }


    public function destroy(Request $request, Doctor $doctor, DoctorLeave $leave): JsonResponse
    {
        $this->authorizeManage($request->user(), $doctor);
        abort_if($leave->doctor_id !== $doctor->id, 404);

        $leave->delete();

        return response()->json(status: 204);
    }

    private function authorizeManage(User $user, Doctor $doctor): void
    {
        $allowed = $user->hasRole('admin')
            || ($user->hasRole('doctor') && $doctor->user_id === $user->id)
            || ($user->hasRole('staff') && $doctor->id === $user->assigned_doctor_id);

        abort_unless($allowed, 403, 'You cannot manage this doctor\'s schedule.');
    }
}
