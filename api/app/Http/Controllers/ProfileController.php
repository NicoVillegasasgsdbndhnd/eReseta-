<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    public function update(Request $request): UserResource
    {
        $data = $request->validate([
            'name'    => ['sometimes', 'string', 'max:255'],
            'email'   => ['sometimes', 'email', "unique:users,email,{$request->user()->id}"],
            'phone'   => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
        ]);

        $request->user()->update($data);

        return new UserResource($request->user()->fresh());
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
