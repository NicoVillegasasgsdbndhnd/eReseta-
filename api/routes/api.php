<?php

use App\Http\Controllers\AppointmentController;
use App\Http\Controllers\AppointmentRequestController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\BlockchainController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DiagnosticOrderController;
use App\Http\Controllers\DiagnosticTestController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\DoctorLeaveController;
use App\Http\Controllers\FollowUpController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\MedicineController;
use App\Http\Controllers\BreakGlassController;
use App\Http\Controllers\ComplianceController;
use App\Http\Controllers\PatientChartController;
use App\Http\Controllers\PatientConsentController;
use App\Http\Controllers\PatientDocumentController;
use App\Http\Controllers\PatientController;
use App\Http\Controllers\PatientPrivacyController;
use App\Http\Controllers\PatientRecordController;
use App\Http\Controllers\PrescriptionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PublicController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\StaffRequestController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WebhookController;
use App\Http\Controllers\TermsController;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\EnsureTermsAccepted;
use Illuminate\Support\Facades\Route;


Route::post('/webhooks/paymongo', [WebhookController::class, 'paymongo']);

Route::get('/health', HealthController::class);




Route::prefix('public')->group(function (): void {
    Route::get('/doctors',                       [PublicController::class, 'doctors']);
    Route::get('/doctors/{doctor}/availability', [PublicController::class, 'doctorAvailability']);
    Route::post('/appointment-requests/send-otp', [PublicController::class, 'sendAppointmentOtp'])
        ->middleware('throttle:5,1');
    Route::post('/appointment-requests',         [PublicController::class, 'storeAppointmentRequest'])
        ->middleware('throttle:5,1');
    Route::get('/terms',                         [TermsController::class, 'publicTerms']);
    // Signed link from the "activation link expired" email — patient requests a fresh link.
    Route::get('/activation/renew/{user}',       [PublicController::class, 'requestReactivation'])
        ->name('activation.renew')
        ->middleware('signed');
});


Route::prefix('auth')->group(function (): void {
    Route::post('/login',    [AuthController::class, 'login'])->middleware('throttle:10,1'); // brute-force rate limit (10/min)
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
    Route::post('/reset-password',  [AuthController::class, 'resetPassword'])->middleware('throttle:5,1');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me',      [AuthController::class, 'me']);
    });
});




Route::middleware(['auth:sanctum', 'throttle:120,1', EnsurePasswordChanged::class, EnsureTermsAccepted::class])->group(function (): void { // everything below requires login (Sanctum)


    Route::get('/me/terms',         [TermsController::class, 'me']);
    Route::post('/me/terms/accept', [TermsController::class, 'accept']);


    Route::get('/doctors',                          [DoctorController::class, 'index']);
    Route::get('/doctors/{doctor}',                 [DoctorController::class, 'show']);
    Route::get('/doctors/{doctor}/availability',    [DoctorController::class, 'availability']);
    Route::get('/doctors/{doctor}/leaves',           [DoctorLeaveController::class, 'index']);
    Route::post('/doctors/{doctor}/leaves',          [DoctorLeaveController::class, 'store']);
    Route::post('/doctors/{doctor}/leaves/month',    [DoctorLeaveController::class, 'storeMonth']);
    Route::delete('/doctors/{doctor}/leaves/{leave}', [DoctorLeaveController::class, 'destroy']);


    Route::get('/patients',          [PatientController::class, 'index']);
    Route::post('/patients',         [PatientController::class, 'store']);
    Route::post('/patients/{patient}/resend-activation', [PatientController::class, 'resendActivation']);
    Route::get('/patients/{patient}', [PatientController::class, 'show']);
    Route::put('/patients/{patient}', [PatientController::class, 'update']);
    Route::delete('/patients/{patient}', [PatientController::class, 'destroy']);


    Route::get('/appointments',                              [AppointmentController::class, 'index']);
    Route::post('/appointments',                             [AppointmentController::class, 'store']);
    Route::get('/appointments/{appointment}',                [AppointmentController::class, 'show']);
    Route::put('/appointments/{appointment}/status',         [AppointmentController::class, 'updateStatus']);


    Route::post('/follow-ups',                               [FollowUpController::class, 'store']);


    Route::get('/appointment-requests',                      [AppointmentRequestController::class, 'index']);
    Route::post('/appointment-requests/{appointmentRequest}/approve', [AppointmentRequestController::class, 'approve']);
    Route::post('/appointment-requests/{appointmentRequest}/decline', [AppointmentRequestController::class, 'decline']);


    Route::get('/patient-records',                           [PatientRecordController::class, 'allRecords']);
    Route::get('/patients/{patient}/chart',                  [PatientChartController::class, 'show']);
    Route::get('/me/chart',                                  [PatientChartController::class, 'myChart']);


    Route::get('/patients/{patient}/consent',                [PatientConsentController::class, 'index']);
    Route::post('/patients/{patient}/consent',               [PatientConsentController::class, 'store']);
    Route::post('/patients/{patient}/break-glass',           [BreakGlassController::class, 'store']);
    Route::get('/break-glass-alerts',                        [BreakGlassController::class, 'index']);


    Route::get('/compliance/consent-register',               [ComplianceController::class, 'consentRegister']);
    Route::get('/compliance/terms-acceptance',               [ComplianceController::class, 'termsAcceptance']);


    Route::get('/me/consent',                                [PatientPrivacyController::class, 'consent']);
    Route::get('/me/privacy-log',                            [PatientPrivacyController::class, 'log']);
    Route::post('/me/consent/withdraw',                      [PatientPrivacyController::class, 'withdraw']);
    Route::get('/patients/{patient}/rx-safety',              [PatientChartController::class, 'rxSafety']);
    Route::get('/patients/{patient}/records',                [PatientRecordController::class, 'index']);
    Route::post('/patient-records',                          [PatientRecordController::class, 'store']);
    Route::get('/patient-records/{patientRecord}',           [PatientRecordController::class, 'show']);
    Route::put('/patient-records/{patientRecord}',           [PatientRecordController::class, 'update']);
    Route::post('/patient-records/{patientRecord}/break-glass', [PatientChartController::class, 'breakGlass']);


    Route::get('/patients/{patient}/documents',           [PatientDocumentController::class, 'index']);
    Route::post('/patients/{patient}/documents',          [PatientDocumentController::class, 'store']);
    Route::delete('/patient-documents/{patientDocument}', [PatientDocumentController::class, 'destroy']);


    Route::get('/medicines',                                 [MedicineController::class, 'index']);
    Route::get('/medicines/{medicine}/brands',               [MedicineController::class, 'brands']);
    Route::put('/medicines/{medicine}/availability',         [MedicineController::class, 'updateAvailability']);
    Route::put('/medicine-brands/{medicineBrand}/availability', [MedicineController::class, 'updateBrandAvailability']);


    Route::get('/diagnostic-tests',                          [DiagnosticTestController::class, 'index']);
    Route::post('/diagnostic-tests',                         [DiagnosticTestController::class, 'store']);
    Route::put('/diagnostic-tests/{diagnosticTest}/availability', [DiagnosticTestController::class, 'updateAvailability']);
    Route::delete('/diagnostic-tests/{diagnosticTest}',      [DiagnosticTestController::class, 'destroy']);
    Route::get('/diagnostic-orders',                         [DiagnosticOrderController::class, 'index']);
    Route::post('/diagnostic-orders',                        [DiagnosticOrderController::class, 'store']);
    Route::get('/diagnostic-orders/{diagnosticOrder}',       [DiagnosticOrderController::class, 'show']);
    Route::put('/diagnostic-orders/{diagnosticOrder}/status',[DiagnosticOrderController::class, 'updateStatus']);


    Route::get('/prescriptions',                             [PrescriptionController::class, 'index']);
    Route::post('/prescriptions',                            [PrescriptionController::class, 'store']);
    Route::get('/prescriptions/{prescription}',              [PrescriptionController::class, 'show']);
    Route::put('/prescriptions/{prescription}/verify',       [PrescriptionController::class, 'verify']);
    Route::put('/prescriptions/{prescription}/dispense',     [PrescriptionController::class, 'dispense']);


    Route::get('/billing-records',                           [BillingController::class, 'index']);
    Route::post('/billing-records',                          [BillingController::class, 'store']);
    Route::post('/billing-records/{billingRecord}/payment-link', [BillingController::class, 'paymentLink']);
    Route::post('/billing-records/{billingRecord}/mark-paid',    [BillingController::class, 'markPaid']);
    Route::get('/patients/{patient}/billing-summary',        [BillingController::class, 'summary']);


    Route::get('/dashboard/summary',                         [DashboardController::class, 'summary']);
    Route::get('/dashboard/appointment-stats',               [DashboardController::class, 'appointmentStats']);
    Route::get('/dashboard/prescription-activity',           [DashboardController::class, 'prescriptionActivity']);
    Route::get('/dashboard/audit-logs',                      [DashboardController::class, 'auditLogs']);


    Route::get('/blockchain/activity',                       [BlockchainController::class, 'activity']);
    Route::get('/blockchain/status',                         [BlockchainController::class, 'status']);


    Route::get('/reports/appointments',                      [ReportController::class, 'appointments']);
    Route::get('/reports/prescriptions',                     [ReportController::class, 'prescriptions']);


    Route::get('/users',                                     [UserController::class, 'index']);
    Route::post('/users',                                    [UserController::class, 'store']);
    Route::put('/users/{user}',                              [UserController::class, 'update']);
    Route::delete('/users/{user}',                           [UserController::class, 'destroy']);


    Route::get('/staff-requests',                            [StaffRequestController::class, 'index']);
    Route::post('/staff-requests/{staffRequest}/approve',    [StaffRequestController::class, 'approve']);
    Route::post('/staff-requests/{staffRequest}/reject',     [StaffRequestController::class, 'reject']);


    Route::put('/profile',                                   [ProfileController::class, 'update']);
    Route::post('/me/complete-profile',                      [ProfileController::class, 'completeProfile']);
    Route::post('/profile/photo',                            [ProfileController::class, 'uploadPhoto']);
    Route::delete('/profile/photo',                          [ProfileController::class, 'removePhoto']);
    Route::post('/profile/signature',                        [ProfileController::class, 'uploadSignature']);
    Route::delete('/profile/signature',                      [ProfileController::class, 'removeSignature']);
});
