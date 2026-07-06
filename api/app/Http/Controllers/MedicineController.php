<?php

namespace App\Http\Controllers;

use App\Http\Resources\MedicineBrandResource;
use App\Http\Resources\MedicineResource;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MedicineController extends Controller
{





    public function index(Request $request): AnonymousResourceCollection
    {
        $medicines = Medicine::query()
            ->with(['brands' => fn ($q) => $q->orderBy('brand_name')])
            ->when($request->search, fn ($q, $search) =>
                $q->where(fn ($w) => $w
                    ->where('generic_name', 'like', '%' . $search . '%')
                    ->orWhereHas('brands', fn ($b) => $b->where('brand_name', 'like', '%' . $search . '%'))
                )
            )
            ->when($request->boolean('available_only'), fn ($q) =>
                $q->where('is_available', true)
            )
            ->orderBy('generic_name')
            ->paginate(20)
            ->withQueryString();

        return MedicineResource::collection($medicines);
    }





    public function brands(Request $request, Medicine $medicine): AnonymousResourceCollection
    {
        $brands = $medicine->brands()
            ->when($request->boolean('available_only'), fn ($q) => $q->where('is_available', true))
            ->orderBy('brand_name')
            ->get();

        return MedicineBrandResource::collection($brands);
    }




    public function updateAvailability(Request $request, Medicine $medicine): MedicineResource
    {
        $this->authorizeStockManager($request);

        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $medicine->update(['is_available' => $validated['is_available']]);

        return new MedicineResource($medicine->load('brands'));
    }




    public function updateBrandAvailability(Request $request, MedicineBrand $medicineBrand): MedicineBrandResource
    {
        $this->authorizeStockManager($request);

        $validated = $request->validate(['is_available' => ['required', 'boolean']]);
        $medicineBrand->update(['is_available' => $validated['is_available']]);

        return new MedicineBrandResource($medicineBrand);
    }

    private function authorizeStockManager(Request $request): void
    {
        abort_if(
            ! $request->user()->hasRole('pharmacist') && ! $request->user()->hasRole('admin'),
            403,
            'Only pharmacists or admins can update medicine availability.'
        );
    }
}
