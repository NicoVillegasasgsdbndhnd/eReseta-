<?php

namespace App\Http\Controllers;

use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $result = $this->authService->login(
            $request->email,
            $request->password
        );

        return response()->json([
            'token' => $result['token'],
            'user'  => new UserResource($result['user']),
        ]);
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json([
            'token' => $result['token'],
            'user'  => new UserResource($result['user']),
        ], 201);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource(
            $request->user()->load('patient', 'doctor', 'assignedDoctor.user', 'staffRequest')
        ));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
