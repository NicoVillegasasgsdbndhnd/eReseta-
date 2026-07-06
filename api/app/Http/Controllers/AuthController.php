<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {

        $preCheck = User::where('email', $request->email)
            ->with('staffRequest')
            ->first();

        if ($preCheck?->hasRole('staff')) {
            $status = $preCheck->staffRequest?->status;
            if ($status !== 'approved') {
                $message = $status === 'rejected'
                    ? 'Your staff authorization was rejected by the physician. Please contact the administrator.'
                    : 'Your account is pending approval from the assigned physician. You will be notified once authorized.';

                return response()->json(['message' => $message], 403);
            }
        }

        try {
            $result = $this->authService->login($request->email, $request->password);
        } catch (ValidationException) {
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401); // generic error = no account enumeration
        }



        if ($result['user']->status === UserStatus::Inactive) {
            $result['user']->tokens()->delete();

            return response()->json([
                'message' => 'Your account has been deactivated. Please contact the administrator.',
            ], 403);
        }

        return response()->json([
            'token' => $result['token'],
            'user'  => new UserResource($result['user']->load('patient')),
        ]);
    }





    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => 'If that email is registered, a password reset link has been sent.',
        ]);
    }





    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password'             => $password, // hashed via the model's 'hashed' cast
                    'must_change_password' => false,
                ])->save();

                $user->tokens()->delete(); // revoke all active sessions
                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Your password has been reset. You can now sign in.']);
        }


        throw ValidationException::withMessages(['email' => [__($status)]]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource(
            $request->user()->load('patient', 'doctor', 'assignedDoctor.user', 'staffRequest')
        ));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete(); // revoke token on logout

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
