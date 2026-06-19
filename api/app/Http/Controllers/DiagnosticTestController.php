<?php

namespace App\Http\Controllers;

use App\Http\Resources\DiagnosticTestResource;
use App\Models\DiagnosticTest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiagnosticTestController extends Controller
{
    /**
     * Searchable, paginated catalog of diagnostic tests. Any authenticated clinical role may read
     * it (doctor's order combobox + admin catalog page).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $tests = DiagnosticTest::query()
            ->when($request->search, fn ($q, $search) =>
                $q->where('name', 'like', '%' . $search . '%')
            )
            ->when($request->boolean('available_only'), fn ($q) =>
                $q->where('is_available', true)
            )
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return DiagnosticTestResource::collection($tests);
    }

    /** Admin adds a test to the catalog. */
    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'name'     => ['required', 'string', 'max:255', 'unique:diagnostic_tests,name'],
            'category' => ['nullable', 'string', 'max:100'],
        ]);

        $test = DiagnosticTest::create($validated);

        return response()->json(new DiagnosticTestResource($test), 201);
    }

    /** Admin toggles availability — if a test isn't offered, the doctor won't see it. */
    public function updateAvailability(Request $request, DiagnosticTest $diagnosticTest): DiagnosticTestResource
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $diagnosticTest->update(['is_available' => $validated['is_available']]);

        return new DiagnosticTestResource($diagnosticTest);
    }

    /** Admin removes a test from the catalog. */
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
