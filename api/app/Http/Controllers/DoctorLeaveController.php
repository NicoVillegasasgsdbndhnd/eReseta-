<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DoctorLeaveController extends Controller
{




    public function index(Doctor $doctor): JsonResponse
    {
        $leaves = $doctor->leaves()->orderBy('date')->orderBy('start_time')->get(['id', 'date', 'start_time', 'end_time', 'reason']);

        return response()->json(['data' => $leaves]);
    }


    public function store(Request $request, Doctor $doctor): JsonResponse
    {
        $this->authorizeManage($request->user(), $doctor);

        $validated = $request->validate([
            'date'       => ['required', 'date'],
            'start_time' => ['nullable', 'date_format:H:i', 'required_with:end_time'],
            'end_time'   => ['nullable', 'date_format:H:i', 'required_with:start_time', 'after:start_time'],
            'reason'     => ['nullable', 'string', 'max:255'],
        ]);

        // Whole-day leave: one per date (idempotent). Partial (per-hour) leave: several allowed per day.
        if (empty($validated['start_time'])) {
            $leave = DoctorLeave::updateOrCreate(
                ['doctor_id' => $doctor->id, 'date' => $validated['date'], 'start_time' => null],
                ['end_time' => null, 'reason' => $validated['reason'] ?? null],
            );
        } else {
            $leave = DoctorLeave::create([
                'doctor_id'  => $doctor->id,
                'date'       => $validated['date'],
                'start_time' => $validated['start_time'],
                'end_time'   => $validated['end_time'],
                'reason'     => $validated['reason'] ?? null,
            ]);
        }

        return response()->json(['data' => $leave->only('id', 'date', 'start_time', 'end_time', 'reason')], 201);
    }

    /** Bulk: mark every upcoming day of a month as a whole-day leave (one button). */
    public function storeMonth(Request $request, Doctor $doctor): JsonResponse
    {
        $this->authorizeManage($request->user(), $doctor);

        $validated = $request->validate([
            'month'  => ['required', 'date_format:Y-m'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $cursor  = Carbon::createFromFormat('Y-m', $validated['month'])->startOfMonth();
        $end     = $cursor->copy()->endOfMonth();
        $today   = now()->startOfDay();
        $created = 0;

        for (; $cursor <= $end; $cursor->addDay()) {
            if ($cursor->lt($today)) {
                continue; // skip past days
            }
            DoctorLeave::updateOrCreate(
                ['doctor_id' => $doctor->id, 'date' => $cursor->toDateString(), 'start_time' => null],
                ['end_time' => null, 'reason' => $validated['reason'] ?? 'On leave (whole month)'],
            );
            $created++;
        }

        return response()->json(['message' => "Whole-month leave applied to {$created} day(s).", 'created' => $created], 201);
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
