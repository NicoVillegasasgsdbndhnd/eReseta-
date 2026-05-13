<?php

namespace App\Http\Controllers;

use App\Http\Resources\AppointmentResource;
use App\Http\Resources\DoctorResource;
use App\Models\Doctor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DoctorController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return DoctorResource::collection(
            Doctor::with('user')->orderBy('id')->paginate(100)
        );
    }

    public function show(Doctor $doctor): DoctorResource
    {
        return new DoctorResource($doctor->load('user'));
    }

    public function availability(Request $request, Doctor $doctor): AnonymousResourceCollection
    {
        $request->validate(['date' => ['required', 'date']]);

        $booked = $doctor->appointments()
            ->with('patient.user')
            ->whereDate('scheduled_at', $request->date)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        return AppointmentResource::collection($booked);
    }
}
