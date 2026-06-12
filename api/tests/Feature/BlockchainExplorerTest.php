<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BlockchainExplorerTest extends TestCase
{
    public function test_admin_can_view_blockchain_activity(): void
    {
        Http::fake(); // don't make a real gateway probe during tests

        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/blockchain/activity')
            ->assertStatus(200)
            ->assertJsonStructure([
                'status' => ['enabled', 'online', 'gateway_url', 'channel', 'chaincode'],
                'stats'  => ['anchored_prescriptions', 'total_prescriptions', 'anchored_events', 'total_events'],
                'recent',
            ]);
    }

    public function test_non_admin_cannot_view_blockchain_activity(): void
    {
        $doctor = $this->user('doctor');

        $this->actingAs($doctor, 'sanctum')
            ->getJson('/api/blockchain/activity')
            ->assertStatus(403);
    }
}
