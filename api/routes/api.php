<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientRecordController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// ── Webhooks (no auth) ────────────────────────────────────────────────────────
Route::post('/webhooks/paymongo', [WebhookController::class, 'paymongo']);

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

    // Patient Records
    Route::get('/patient-records',                           [PatientRecordController::class, 'allRecords']);
    Route::get('/patients/{patient}/records',                [PatientRecordController::class, 'index']);
    Route::post('/patient-records',                          [PatientRecordController::class, 'store']);
    Route::get('/patient-records/{patientRecord}',           [PatientRecordController::class, 'show']);
    Route::put('/patient-records/{patientRecord}',           [PatientRecordController::class, 'update']);

    // Prescriptions
    Route::get('/prescriptions',                             [PrescriptionController::class, 'index']);
    Route::post('/prescriptions',                            [PrescriptionController::class, 'store']);
    Route::get('/prescriptions/{prescription}',              [PrescriptionController::class, 'show']);
    Route::put('/prescriptions/{prescription}/verify',       [PrescriptionController::class, 'verify']);
    Route::put('/prescriptions/{prescription}/dispense',     [PrescriptionController::class, 'dispense']);

    // Billing
    Route::get('/billing-records',                           [BillingController::class, 'index']);
    Route::post('/billing-records',                          [BillingController::class, 'store']);
    Route::post('/billing-records/{billingRecord}/payment-link', [BillingController::class, 'paymentLink']);
    Route::post('/billing-records/{billingRecord}/mark-paid',    [BillingController::class, 'markPaid']);
    Route::get('/patients/{patient}/billing-summary',        [BillingController::class, 'summary']);

    // Dashboard
    Route::get('/dashboard/summary',                         [DashboardController::class, 'summary']);
    Route::get('/dashboard/appointment-stats',               [DashboardController::class, 'appointmentStats']);
    Route::get('/dashboard/prescription-activity',           [DashboardController::class, 'prescriptionActivity']);
    Route::get('/dashboard/audit-logs',                      [DashboardController::class, 'auditLogs']);

    // Reports
    Route::get('/reports/appointments',                      [ReportController::class, 'appointments']);
    Route::get('/reports/prescriptions',                     [ReportController::class, 'prescriptions']);

    // Users (admin / it_admin)
    Route::get('/users',                                     [UserController::class, 'index']);
    Route::post('/users',                                    [UserController::class, 'store']);
    Route::put('/users/{user}',                              [UserController::class, 'update']);

    // Profile (all roles)
    Route::put('/profile',                                   [ProfileController::class, 'update']);
    Route::post('/profile/photo',                            [ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',                          [ProfileController::class, 'removePhoto']);
});
