<?php

namespace Tests\Feature;

use Tests\TestCase;

class DoctorLeaveHourlyTest extends TestCase
{
    public function test_partial_leave_blocks_only_its_slots_in_public_availability(): void
    {
        ['doctor' => $doctor, 'user' => $doctorUser] = $this->makeDoctor();
        $date = now()->addDay()->toDateString();

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/doctors/{$doctor->id}/leaves", [
                'date' => $date, 'start_time' => '13:00', 'end_time' => '15:00',
            ])->assertStatus(201)
            ->assertJsonPath('data.start_time', '13:00');

        $res    = $this->getJson("/api/public/doctors/{$doctor->id}/availability?date={$date}");
        $booked = $res->assertStatus(200)->json('booked');

        // 13:00–15:00 blocked (30-min slots), end exclusive
        $this->assertContains('13:00', $booked);
        $this->assertContains('13:30', $booked);
        $this->assertContains('14:00', $booked);
        $this->assertContains('14:30', $booked);
        $this->assertNotContains('15:00', $booked);
        $this->assertNotContains('12:30', $booked);

        // NOT a whole-day leave
        $this->assertNotContains($date, $res->json('leaves'));
    }

    public function test_whole_day_leave_greys_the_day(): void
    {
        ['doctor' => $doctor, 'user' => $doctorUser] = $this->makeDoctor();
        $date = now()->addDays(2)->toDateString();

        $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/doctors/{$doctor->id}/leaves", ['date' => $date])
            ->assertStatus(201);

        $res = $this->getJson("/api/public/doctors/{$doctor->id}/availability?date={$date}");
        $this->assertContains($date, $res->json('leaves'));
    }

    public function test_month_bulk_marks_all_upcoming_days(): void
    {
        ['doctor' => $doctor, 'user' => $doctorUser] = $this->makeDoctor();
        $next  = now()->addMonth();
        $month = $next->format('Y-m');

        $res = $this->actingAs($doctorUser, 'sanctum')
            ->postJson("/api/doctors/{$doctor->id}/leaves/month", ['month' => $month]);

        $res->assertStatus(201);
        $this->assertSame((int) $next->daysInMonth, $res->json('created'));
        $this->assertDatabaseCount('doctor_leaves', (int) $next->daysInMonth);
    }
}
