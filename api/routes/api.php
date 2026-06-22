<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlockchainController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiagnosticOrderController;
use App\Http\Controllers\DiagnosticTestController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\DoctorLeaveController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\PatientChartController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientRecordController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StaffRequestController;
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
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
    Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:10,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});

// ── Authenticated routes ───────────────────────────────────────────────────────
// Global per-user rate limit (120 req/min) on top of Sanctum auth — throttles
// scraping/abuse of authenticated endpoints (keyed by user id when authenticated).
Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function (): void {

    // Doctors
    Route::get('/doctors',                          [DoctorController::class, 'index']);
    Route::get('/doctors/{doctor}',                 [DoctorController::class, 'show']);
    Route::get('/doctors/{doctor}/availability',    [DoctorController::class, 'availability']);
    Route::get('/doctors/{doctor}/leaves',           [DoctorLeaveController::class, 'index']);
    Route::post('/doctors/{doctor}/leaves',          [DoctorLeaveController::class, 'store']);
    Route::delete('/doctors/{doctor}/leaves/{leave}', [DoctorLeaveController::class, 'destroy']);

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
    Route::get('/patients/{patient}/chart',                  [PatientChartController::class, 'show']);
    Route::get('/patients/{patient}/records',                [PatientRecordController::class, 'index']);
    Route::post('/patient-records',                          [PatientRecordController::class, 'store']);
    Route::get('/patient-records/{patientRecord}',           [PatientRecordController::class, 'show']);
    Route::put('/patient-records/{patientRecord}',           [PatientRecordController::class, 'update']);
    Route::post('/patient-records/{patientRecord}/break-glass', [PatientChartController::class, 'breakGlass']);

    // Medicines (generic catalog — read for all clinical roles; availability toggle is pharmacist/admin)
    Route::get('/medicines',                                 [MedicineController::class, 'index']);
    Route::put('/medicines/{medicine}/availability',         [MedicineController::class, 'updateAvailability']);

    // Diagnostic test catalog (admin-managed) + doctor orders
    Route::get('/diagnostic-tests',                          [DiagnosticTestController::class, 'index']);
    Route::post('/diagnostic-tests',                         [DiagnosticTestController::class, 'store']);
    Route::put('/diagnostic-tests/{diagnosticTest}/availability', [DiagnosticTestController::class, 'updateAvailability']);
    Route::delete('/diagnostic-tests/{diagnosticTest}',      [DiagnosticTestController::class, 'destroy']);
    Route::get('/diagnostic-orders',                         [DiagnosticOrderController::class, 'index']);
    Route::post('/diagnostic-orders',                        [DiagnosticOrderController::class, 'store']);
    Route::get('/diagnostic-orders/{diagnosticOrder}',       [DiagnosticOrderController::class, 'show']);
    Route::put('/diagnostic-orders/{diagnosticOrder}/status',[DiagnosticOrderController::class, 'updateStatus']);

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

    // Blockchain explorer (admin oversight — live ledger activity feed)
    Route::get('/blockchain/activity',                       [BlockchainController::class, 'activity']);

    // Reports
    Route::get('/reports/appointments',                      [ReportController::class, 'appointments']);
    Route::get('/reports/prescriptions',                     [ReportController::class, 'prescriptions']);

    // Users (admin / staff)
    Route::get('/users',                                     [UserController::class, 'index']);
    Route::post('/users',                                    [UserController::class, 'store']);
    Route::put('/users/{user}',                              [UserController::class, 'update']);
    Route::delete('/users/{user}',                           [UserController::class, 'destroy']);

    // Staff requests (doctor approves/rejects their assigned staff)
    Route::get('/staff-requests',                            [StaffRequestController::class, 'index']);
    Route::post('/staff-requests/{staffRequest}/approve',    [StaffRequestController::class, 'approve']);
    Route::post('/staff-requests/{staffRequest}/reject',     [StaffRequestController::class, 'reject']);

    // Profile (all roles)
    Route::put('/profile',                                   [ProfileController::class, 'update']);
    Route::post('/profile/photo',                            [ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',                          [ProfileController::class, 'removePhoto']);
});
