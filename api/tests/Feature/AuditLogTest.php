<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    public function test_audit_logs_include_each_users_role(): void
    {
        $admin  = $this->user('admin');
        $doctor = $this->user('doctor');

        AuditLog::create([
            'user_id'     => $doctor->id,
            'action'      => 'CREATE',
            'target_type' => 'Prescription',
            'target_id'   => 1,
            'ip_address'  => '127.0.0.1',
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/dashboard/audit-logs')
            ->assertStatus(200);

        // The role must be surfaced as a flat string on the nested user so the
        // frontend audit-log role tabs can filter by it (Spatie stores it in a pivot).
        $response->assertJsonPath('data.0.user.role', 'doctor');
    }

    public function test_audit_logs_are_admin_only(): void
    {
        $this->actingAs($this->user('doctor'), 'sanctum')
            ->getJson('/api/dashboard/audit-logs')
            ->assertStatus(403);
    }
}
