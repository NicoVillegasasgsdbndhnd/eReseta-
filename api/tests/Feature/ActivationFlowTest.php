<?php

namespace Tests\Feature;

use App\Notifications\PatientAccountActivation;
use App\Notifications\PatientActivationExpired;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ActivationFlowTest extends TestCase
{
    public function test_staff_resend_sends_a_link_and_clears_a_pending_request(): void
    {
        Notification::fake();
        ['patient' => $patient, 'user' => $user] = $this->makePatient();
        $user->forceFill([
            'activated_at'                   => null,
            'activation_sent_at'             => now()->subDays(3),
            'reactivation_requested_at'      => now()->subHour(),
            'activation_expired_notified_at' => now()->subHour(),
        ])->save();

        $this->actingAs($this->user('staff'), 'sanctum')
            ->postJson("/api/patients/{$patient->id}/resend-activation")
            ->assertStatus(200)
            ->assertJsonPath('activation.reactivation_requested', false)
            ->assertJsonPath('activation.activated', false);

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->activation_sent_at);
        $this->assertNull($fresh->reactivation_requested_at);
        $this->assertNull($fresh->activation_expired_notified_at);
        Notification::assertSentTo($user, PatientAccountActivation::class);
    }

    public function test_resend_is_blocked_for_an_already_activated_patient(): void
    {
        ['patient' => $patient, 'user' => $user] = $this->makePatient();
        $user->forceFill(['activated_at' => now()])->save();

        $this->actingAs($this->user('staff'), 'sanctum')
            ->postJson("/api/patients/{$patient->id}/resend-activation")
            ->assertStatus(422);
    }

    public function test_expired_command_notifies_once_only(): void
    {
        Notification::fake();
        ['user' => $user] = $this->makePatient();
        $user->forceFill([
            'activated_at'                   => null,
            'activation_sent_at'             => now()->subDays(3), // past the 48h window
            'activation_expired_notified_at' => null,
        ])->save();

        $this->artisan('activation:notify-expired')->assertSuccessful();
        Notification::assertSentTo($user, PatientActivationExpired::class);
        $this->assertNotNull($user->fresh()->activation_expired_notified_at);

        Notification::fake(); // reset
        $this->artisan('activation:notify-expired')->assertSuccessful();
        Notification::assertNothingSent();
    }

    public function test_signed_renew_link_records_a_reactivation_request(): void
    {
        ['user' => $user] = $this->makePatient();
        $user->forceFill(['activated_at' => null, 'activation_sent_at' => now()->subDays(3)])->save();

        $url = URL::temporarySignedRoute('activation.renew', now()->addDay(), ['user' => $user->id]);
        $this->get($url)->assertStatus(200)->assertSee('Request received');

        $this->assertNotNull($user->fresh()->reactivation_requested_at);
    }
}
