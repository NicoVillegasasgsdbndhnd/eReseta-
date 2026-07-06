<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use App\Models\PatientDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;





class PatientDocumentController extends Controller
{
    private function authorizeStaff(Request $request): void
    {
        $user = $request->user();
        abort_if(
            $user->hasRole('patient') || $user->hasRole('pharmacist'),
            403,
            'Unauthorized.'
        );
    }

    public function index(Request $request, Patient $patient): JsonResponse
    {
        $this->authorizeStaff($request);

        return response()->json(['data' => $this->serialize($patient->documents()->latest()->get())]);
    }

    public function store(Request $request, Patient $patient): JsonResponse
    {
        $this->authorizeStaff($request);

        $request->validate([
            'file'     => ['required', 'file', 'max:5120', 'mimes:jpg,jpeg,png,webp,pdf'],
            'category' => ['required', Rule::in(array_keys(PatientDocument::CATEGORIES))],
        ]);

        $file = $request->file('file');
        $path = $file->store("patient-documents/{$patient->id}", 'public');

        $doc = PatientDocument::create([
            'patient_id'    => $patient->id,
            'category'      => $request->category,
            'original_name' => $file->getClientOriginalName(),
            'path'          => $path,
            'mime'          => $file->getClientMimeType(),
            'size'          => $file->getSize(),
            'uploaded_by'   => $request->user()->id,
        ]);

        return response()->json($this->serialize(collect([$doc]))->first(), 201);
    }

    public function destroy(Request $request, PatientDocument $patientDocument): JsonResponse
    {
        $this->authorizeStaff($request);

        Storage::disk('public')->delete($patientDocument->path);
        $patientDocument->delete();

        return response()->json(null, 204);
    }


    private function serialize($docs)
    {
        return $docs->map(fn (PatientDocument $d) => [
            'id'            => $d->id,
            'category'      => $d->category,
            'category_label' => PatientDocument::CATEGORIES[$d->category] ?? 'Document',
            'original_name' => $d->original_name,
            'url'           => $d->url(),
            'mime'          => $d->mime,
            'size'          => $d->size,
            'uploaded_at'   => $d->created_at?->toDateTimeString(),
        ]);
    }
}
