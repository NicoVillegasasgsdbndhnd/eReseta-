<?php

namespace Tests\Feature;

use App\Models\User;
use App\Rules\UniquePasswordAcrossUsers;
use Illuminate\Support\Facades\Validator;
use Tests\TestCase;

class UniquePasswordTest extends TestCase
{
    public function test_a_password_already_used_by_another_user_is_rejected(): void
    {
        $existing = $this->user('staff');
        $existing->forceFill(['password' => 'Duplicate#123'])->save();

        $validator = Validator::make(
            ['password' => 'Duplicate#123'],
            ['password' => [new UniquePasswordAcrossUsers()]],
        );

        $this->assertTrue($validator->fails());
        $this->assertSame('Please choose a different password.', $validator->errors()->first('password'));
    }

    public function test_a_fresh_password_passes(): void
    {
        $this->user('staff')->forceFill(['password' => 'Something#111'])->save();

        $validator = Validator::make(
            ['password' => 'Totally#Different222'],
            ['password' => [new UniquePasswordAcrossUsers()]],
        );

        $this->assertFalse($validator->fails());
    }

    public function test_the_excepted_user_is_not_compared_against_itself(): void
    {
        $user = $this->user('doctor');
        $user->forceFill(['password' => 'Mine#12345'])->save();

        // Re-entering your own password must not be blocked by your own hash.
        $validator = Validator::make(
            ['password' => 'Mine#12345'],
            ['password' => [new UniquePasswordAcrossUsers($user->id)]],
        );

        $this->assertFalse($validator->fails());
    }
}
