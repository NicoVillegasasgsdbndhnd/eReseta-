<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAppointmentRequestRequest;
use App\Models\AppointmentRequest;
use App\Models\Doctor;
use App\Models\DoctorLeave;
use App\Models\User;
use Illuminate\Http\Response;
use App\Notifications\AppointmentBookingOtp;
use App\Notifications\AppointmentRequestReceived;
use App\Services\AppointmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;






class PublicController extends Controller
{
    public function __construct(private readonly AppointmentService $appointments) {}


    public function doctors(): JsonResponse
    {
        $doctors = Doctor::with('user:id,name')->orderBy('id')->get()
            ->map(fn (Doctor $d): array => [
                'id'             => $d->id,
                'name'           => $d->user?->name,
                'specialization' => $d->specialization,
                'bio'            => $d->bio,
            ]);

        return response()->json(['data' => $doctors]);
    }





    public function doctorAvailability(Request $request, Doctor $doctor): JsonResponse
    {
        $request->validate(['date' => ['required', 'date']]);

        $booked = $doctor->appointments()
            ->whereDate('scheduled_at', $request->date)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($a): ?string => $a->scheduled_at?->format('H:i'))
            ->filter()
            ->toBase();

        // Partial (per-hour) leaves on that date also block their 30-min slots.
        $leaveBlocked = DoctorLeave::where('doctor_id', $doctor->id)
            ->whereDate('date', $request->date)
            ->whereNotNull('start_time')
            ->get()
            ->flatMap(function (DoctorLeave $l): array {
                $slots = [];
                for ($t = Carbon::parse($l->start_time), $end = Carbon::parse($l->end_time); $t < $end; $t->addMinutes(30)) {
                    $slots[] = $t->format('H:i');
                }
                return $slots;
            });

        $booked = $booked->merge($leaveBlocked)->unique()->values();

        // Only whole-day leaves grey out the entire day in the calendar.
        $leaves = DoctorLeave::where('doctor_id', $doctor->id)
            ->whereNull('start_time')
            ->whereDate('date', '>=', now()->toDateString())
            ->orderBy('date')
            ->get()
            ->map(fn (DoctorLeave $l): string => $l->date instanceof \DateTimeInterface
                ? $l->date->format('Y-m-d')
                : (string) $l->date)
            ->values();

        return response()->json([
            'date'   => $request->date,
            'booked' => $booked,
            'leaves' => $leaves,
        ]);
    }


    /** Seconds a requester must wait before another code is sent to the same email. */
    private const OTP_COOLDOWN = 120;

    public function sendAppointmentOtp(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email', 'max:255']]);

        $email = strtolower($request->email);
        $cdKey = 'booking-otp-cooldown:' . $email;

        // Still within the cooldown window: refuse and tell the client how long is left.
        $until = Cache::get($cdKey);
        if (is_int($until) && $until > time()) {
            $remaining = $until - time();

            return response()->json([
                'message'     => "Please wait {$remaining} seconds before requesting another code.",
                'retry_after' => $remaining,
            ], 429);
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put('booking-otp:' . $email, Hash::make($code), now()->addMinutes(10));
        Cache::put($cdKey, time() + self::OTP_COOLDOWN, self::OTP_COOLDOWN);
        Notification::route('mail', $email)->notify(new AppointmentBookingOtp($code));

        return response()->json([
            'message'     => 'A 6-digit verification code has been sent to your email.',
            'retry_after' => self::OTP_COOLDOWN,
        ]);
    }

    public function storeAppointmentRequest(StoreAppointmentRequestRequest $request): JsonResponse
    {
        $data = $request->validated();

        $key    = 'booking-otp:' . strtolower($data['email']);
        $hashed = Cache::get($key);
        if (! $hashed || ! Hash::check($data['otp'], $hashed)) {
            throw ValidationException::withMessages([
                'otp' => ['The verification code is invalid or has expired. Please request a new one.'],
            ]);
        }
        Cache::forget($key); // single use
        unset($data['otp']);

        // The form collects the name in parts; the record stores one combined full_name.
        $data['full_name'] = trim(implode(' ', array_filter([
            $data['first_name'],
            $data['middle_initial'] ?? null,
            $data['last_name'],
            $data['suffix'] ?? null,
        ])));
        unset($data['first_name'], $data['middle_initial'], $data['last_name'], $data['suffix']);

        $this->appointments->assertDoctorNotOnLeave($data['doctor_id'], $data['preferred_date']);
        $this->appointments->assertSlotAvailable($data['doctor_id'], $data['preferred_date']);

        $appointmentRequest = AppointmentRequest::create([
            ...$data,
            'reference_no' => AppointmentRequest::generateReferenceNo(),
            'status'       => 'pending',
        ]);

        $appointmentRequest->load('doctor.user');

        Notification::route('mail', $data['email'])->notify(new AppointmentRequestReceived($appointmentRequest));

        return response()->json([
            'reference_no'       => $appointmentRequest->reference_no,
            'full_name'          => $appointmentRequest->full_name,
            'doctor'             => $appointmentRequest->doctor?->user?->name ?? 'your preferred doctor',
            'preferred_schedule' => $appointmentRequest->preferred_date?->format('l, F j, Y \a\t g:i A'),
            'message'            => 'Your appointment request has been received.',
        ], 201);
    }

    /**
     * Public, signed link from the "activation link expired" email. Records the patient's request
     * for a new link (staff then approve it) and returns a simple confirmation page.
     */
    public function requestReactivation(User $user): Response
    {
        $alreadyActivated = $user->activated_at !== null;

        if (! $alreadyActivated && $user->activation_sent_at !== null) {
            $user->forceFill(['reactivation_requested_at' => now()])->save();
        }

        $heading = $alreadyActivated ? 'Account already active' : 'Request received';
        $body    = $alreadyActivated
            ? 'This account is already activated — you can simply sign in.'
            : 'Thank you. We have notified the DEAMHI staff, who will send you a new activation link shortly. Please check your email again soon.';

        $html = <<<HTML
        <!doctype html><html lang="en"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>eReseta+ — {$heading}</title></head>
        <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f1f5f9;margin:0;padding:40px 16px;color:#0f172a">
          <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#0369a1;margin-bottom:8px">eReseta+ · DEAMHI</div>
            <h1 style="font-size:18px;margin:16px 0 8px">{$heading}</h1>
            <p style="font-size:14px;line-height:1.6;color:#475569">{$body}</p>
          </div>
        </body></html>
        HTML;

        return response($html);
    }
}
