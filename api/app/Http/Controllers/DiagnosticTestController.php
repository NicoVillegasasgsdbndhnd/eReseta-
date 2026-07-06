<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticTestResource;
use App\Models\DiagnosticTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiagnosticTestController extends Controller
{




    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->integer('per_page', 20) ?: 20, 250);

        $tests = DiagnosticTest::query()
            ->when($request->search, fn ($q, $search) =>
                $q->where('name', 'like', '%' . $search . '%')
            )
            ->when($request->filled('category'), fn ($q) =>
                $q->where('category', $request->string('category'))
            )
            ->when($request->boolean('available_only'), fn ($q) =>
                $q->where('is_available', true)
            )
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return DiagnosticTestResource::collection($tests);
    }


    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', 'unique:diagnostic_tests,name'],
            'category'    => ['nullable', 'string', 'max:100'],
            'modality'    => ['nullable', 'string', 'max:100'],
            'body_region' => ['nullable', 'string', 'max:100'],
        ]);

        $test = DiagnosticTest::create($validated);

        return response()->json(new DiagnosticTestResource($test), 201);
    }


    public function updateAvailability(Request $request, DiagnosticTest $diagnosticTest): DiagnosticTestResource
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $diagnosticTest->update(['is_available' => $validated['is_available']]);

        return new DiagnosticTestResource($diagnosticTest);
    }


    public function destroy(Request $request, DiagnosticTest $diagnosticTest): JsonResponse
    {
        $this->authorizeAdmin($request);
        $diagnosticTest->delete();

        return response()->json(status: 204);
    }

    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()->hasRole('admin'), 403, 'Only administrators manage the diagnostic test catalog.');
    }
}
