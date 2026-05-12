<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\PatientController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status'    => 'ok',
    'service'   => 'eReseta+ API',
    'timestamp' => now()->toISOString(),
]));

// ── Auth ──────────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login',    [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});

// ── Authenticated routes ───────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function (): void {

    // Doctors
    Route::get('/doctors',                          [DoctorController::class, 'index']);
    Route::get('/doctors/{doctor}',                 [DoctorController::class, 'show']);
    Route::get('/doctors/{doctor}/availability',    [DoctorController::class, 'availability']);

    // Patients
    Route::get('/patients',          [PatientController::class, 'index']);
    Route::post('/patients',         [PatientController::class, 'store']);
    Route::get('/patients/{patient}', [PatientController::class, 'show']);
    Route::put('/patients/{patient}', [PatientController::class, 'update']);
    Route::delete('/patients/{patient}', [PatientController::class, 'destroy']);

    // Appointments
    Route::get('/appointments',                              [AppointmentController::class, 'index']);
    Route::post('/appointments',                             [AppointmentController::class, 'store']);
    Route::get('/appointments/{appointment}',                [AppointmentController::class, 'show']);
    Route::put('/appointments/{appointment}/status',         [AppointmentController::class, 'updateStatus']);
});
