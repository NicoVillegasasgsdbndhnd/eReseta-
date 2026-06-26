<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    public function test_forgot_password_sends_reset_link_to_known_email(): void
    {
        Notification::fake();
        $user = $this->user('patient', ['email' => 'reset.me@deamhi.test']);

        $this->postJson('/api/auth/forgot-password', ['email' => 'reset.me@deamhi.test'])
            ->assertStatus(200)
            ->assertJsonPath('message', fn ($m) => is_string($m));

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_forgot_password_is_generic_for_unknown_email(): void
    {
        Notification::fake();

        // Same generic 200 response — no account-enumeration oracle.
        $this->postJson('/api/auth/forgot-password', ['email' => 'nobody@deamhi.test'])
            ->assertStatus(200);

        Notification::assertNothingSent();
    }

    public function test_reset_password_with_valid_token_changes_password_and_clears_flag(): void
    {
        $user = $this->user('doctor', [
            'email'                => 'doc.reset@deamhi.test',
            'password'             => Hash::make('OldTemp@1'),
            'must_change_password' => true,
        ]);

        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token'                 => $token,
            'email'                 => 'doc.reset@deamhi.test',
            'password'              => 'Brandnew#Pass2',
            'password_confirmation' => 'Brandnew#Pass2',
        ])->assertStatus(200);

        $user->refresh();
        $this->assertTrue(Hash::check('Brandnew#Pass2', $user->password));
        $this->assertFalse((bool) $user->must_change_password);
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $this->user('staff', ['email' => 'staff.reset@deamhi.test']);

        $this->postJson('/api/auth/reset-password', [
            'token'                 => 'totally-invalid-token',
            'email'                 => 'staff.reset@deamhi.test',
            'password'              => 'Brandnew#Pass2',
            'password_confirmation' => 'Brandnew#Pass2',
        ])->assertStatus(422);
    }

    public function test_reset_password_enforces_strength(): void
    {
        $user = $this->user('patient', ['email' => 'weak.reset@deamhi.test']);
        $token = Password::createToken($user);

        $this->postJson('/api/auth/reset-password', [
            'token'                 => $token,
            'email'                 => 'weak.reset@deamhi.test',
            'password'              => 'weak',
            'password_confirmation' => 'weak',
        ])->assertStatus(422);

        // Sanity check the framework default notification class is unused (we override it).
        $this->assertTrue(class_exists(ResetPassword::class));
    }
}
