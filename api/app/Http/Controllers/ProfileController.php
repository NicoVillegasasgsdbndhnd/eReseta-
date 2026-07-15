<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Rules\UniquePasswordAcrossUsers;
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


            'password'         => ['sometimes', 'required', Password::min(8)->mixedCase()->numbers()->symbols(),
                new UniquePasswordAcrossUsers($request->user()->id)],
            'current_password' => ['required_with:password', 'string'],
        ]);



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
            $user->must_change_password = false; // first-login temp password has been replaced
        }

        $user->save();


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


    public function uploadSignature(Request $request): JsonResponse
    {
        $user = $request->user();
        $doctor = $user->doctor;
        abort_if(! $doctor, 403, 'Only doctors have a signature.');

        $request->validate([
            'signature' => ['required', 'image', 'max:2048', 'mimes:png,jpg,jpeg,webp'],
        ]);

        if ($doctor->signature_image) {
            Storage::disk('public')->delete($doctor->signature_image);
        }

        $path = $request->file('signature')->store("doctor-signatures/{$doctor->id}", 'public');
        $doctor->update(['signature_image' => $path]);

        return response()->json(['signature_image_url' => Storage::disk('public')->url($path)]);
    }

    public function removeSignature(Request $request): JsonResponse
    {
        $doctor = $request->user()->doctor;
        abort_if(! $doctor, 403, 'Only doctors have a signature.');

        if ($doctor->signature_image) {
            Storage::disk('public')->delete($doctor->signature_image);
            $doctor->update(['signature_image' => null]);
        }

        return response()->json(['signature_image_url' => null]);
    }

    /** The patient completes the details deferred from staff registration (post-activation gate). */
    public function completeProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasRole('patient') && $user->patient, 403, 'Only patients complete their own profile.');

        $data = $request->validate([
            'address'                    => ['required', 'string', 'max:500'],
            'emergency_contact_name'     => ['required', 'string', 'max:120'],
            'emergency_contact_phone'    => ['required', 'string', 'max:30'],
            'emergency_contact_relation' => ['nullable', 'string', 'max:60'],
            'known_allergies'            => ['required', 'string', 'max:255'],
        ]);

        $user->patient->update($data);

        return response()->json(new UserResource(
            $user->fresh()->load('patient', 'doctor', 'assignedDoctor.user', 'staffRequest')
        ));
    }
}
