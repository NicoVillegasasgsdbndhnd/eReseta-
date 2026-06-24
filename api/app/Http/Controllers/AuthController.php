<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuthService $authService) {}

    public function login(LoginRequest $request): JsonResponse
    {
        // Block staff accounts that haven't been approved by their doctor yet.
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
            return response()->json(['message' => 'The provided credentials are incorrect.'], 401);
        }

        // Block deactivated accounts (checked AFTER credentials, so it isn't an
        // account-enumeration oracle). Revoke the token just minted so nothing leaks.
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

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource(
            $request->user()->load('patient', 'doctor', 'assignedDoctor.user', 'staffRequest')
        ));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
