<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function update(Request $request): UserResource
    {
        $user = $request->user();

        $data = $request->validate([
            'name'             => ['sometimes', 'string', 'max:255'],
            'email'            => ['sometimes', 'email', "unique:users,email,{$user->id}"],
            'phone'            => ['nullable', 'string', 'max:20'],
            'address'          => ['nullable', 'string', 'max:500'],
            // Optional self-service password change — requires the current password and
            // enforces the same policy as registration.
            'password'         => ['sometimes', 'required', Password::min(8)->mixedCase()->numbers()->symbols()],
            'current_password' => ['required_with:password', 'string'],
        ]);

        // Verify the current password manually (the `current_password` rule binds to the
        // web guard, which is null on Sanctum API requests).
        if (! empty($data['password'])) {
            if (! Hash::check($data['current_password'] ?? '', $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => ['The current password is incorrect.'],
                ]);
            }
        }

        $user->fill(array_intersect_key($data, array_flip(['name', 'email', 'phone', 'address'])));

        if (! empty($data['password'])) {
            $user->password = $data['password']; // hashed via the model's 'hashed' cast
        }

        $user->save();

        // After a password change, revoke every OTHER session; keep the current token.
        if (! empty($data['password'])) {
            $current   = $request->user()->currentAccessToken();
            $currentId = (is_object($current) && isset($current->id)) ? $current->id : null;
            $user->tokens()
                ->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))
                ->delete();
        }

        return new UserResource($user->fresh());
    }

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
        }

        $path = $request->file('photo')->store("profile-photos/{$user->id}", 'public');
        $user->update(['profile_photo_path' => $path]);

        return response()->json([
            'profile_photo_url' => Storage::disk('public')->url($path),
        ]);
    }

    public function removePhoto(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->profile_photo_path) {
            Storage::disk('public')->delete($user->profile_photo_path);
            $user->update(['profile_photo_path' => null]);
        }

        return response()->json(['profile_photo_url' => null]);
    }
}
