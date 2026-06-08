<?php

namespace App\Http\Controllers;

use App\Http\Resources\MedicineResource;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MedicineController extends Controller
{
    /**
     * Searchable, paginated generic medicines catalog. Any authenticated clinical role may read it
     * (used by the doctor's prescription combobox and the pharmacist availability screen).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $medicines = Medicine::query()
            ->when($request->search, fn ($q, $search) =>
                $q->where('generic_name', 'like', '%' . $search . '%')
            )
            ->when($request->boolean('available_only'), fn ($q) =>
                $q->where('is_available', true)
            )
            ->orderBy('generic_name')
            ->paginate(20)
            ->withQueryString();

        return MedicineResource::collection($medicines);
    }

    /**
     * Toggle a medicine's availability (out-of-stock indicator). Pharmacist/admin only.
     */
    public function updateAvailability(Request $request, Medicine $medicine): MedicineResource
    {
        abort_if(
            ! $request->user()->hasRole('pharmacist') && ! $request->user()->hasRole('admin'),
            403,
            'Only pharmacists or admins can update medicine availability.'
        );

        $validated = $request->validate([
            'is_available' => ['required', 'boolean'],
        ]);

        $medicine->update(['is_available' => $validated['is_available']]);

        return new MedicineResource($medicine);
    }
}
