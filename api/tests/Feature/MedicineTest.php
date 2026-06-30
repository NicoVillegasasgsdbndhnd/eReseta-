<?php

namespace Tests\Feature;

use App\Models\Medicine;
use App\Models\MedicineBrand;
use Tests\TestCase;

class MedicineTest extends TestCase
{
    private function seedMedicines(): void
    {
        $para = Medicine::create(['generic_name' => 'Paracetamol', 'dosage_form' => 'tablet']);
        $para->brands()->createMany([
            ['brand_name' => 'Biogesic', 'strength' => '500 mg', 'dosage_form' => 'tablet'],
            ['brand_name' => 'Calpol',   'strength' => '120 mg/5 mL', 'dosage_form' => 'syrup', 'is_available' => false],
        ]);
        Medicine::create(['generic_name' => 'Amoxicillin', 'dosage_form' => 'capsule']);
        Medicine::create(['generic_name' => 'Metformin', 'dosage_form' => 'tablet', 'is_available' => false]);
    }

    public function test_authenticated_clinical_user_can_search_medicines(): void
    {
        $this->seedMedicines();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/medicines?search=para')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.generic_name', 'Paracetamol');
    }

    public function test_medicine_index_returns_full_list_without_search(): void
    {
        $this->seedMedicines();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/medicines')
            ->assertStatus(200)
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure(['data' => [['id', 'generic_name', 'dosage_form', 'is_available', 'strengths', 'brand_count', 'brands']]]);
    }

    public function test_generic_aggregates_its_brand_strengths(): void
    {
        $this->seedMedicines();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/medicines?search=Paracetamol')
            ->assertStatus(200)
            ->assertJsonPath('data.0.brand_count', 2)
            ->assertJsonPath('data.0.strengths', ['500 mg', '120 mg/5 mL']);
    }

    public function test_can_search_by_brand_name(): void
    {
        $this->seedMedicines();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/medicines?search=Biogesic')
            ->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.generic_name', 'Paracetamol');
    }

    public function test_brands_endpoint_lists_a_generics_brands(): void
    {
        $this->seedMedicines();
        $para = Medicine::where('generic_name', 'Paracetamol')->first();
        $doctorUser = $this->makeDoctor()['user'];

        // Non-paginated resource collection — wrapping is disabled, so it's a bare array.
        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/medicines/{$para->id}/brands")
            ->assertStatus(200)
            ->assertJsonCount(2);

        // available_only hides the out-of-stock Calpol
        $this->actingAs($doctorUser, 'sanctum')
            ->getJson("/api/medicines/{$para->id}/brands?available_only=1")
            ->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonPath('0.brand_name', 'Biogesic');
    }

    public function test_pharmacist_can_toggle_brand_availability(): void
    {
        $this->seedMedicines();
        $brand = MedicineBrand::where('brand_name', 'Biogesic')->first();
        $pharmacist = $this->user('pharmacist');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/medicine-brands/{$brand->id}/availability", ['is_available' => false])
            ->assertStatus(200)
            ->assertJsonPath('is_available', false);

        $this->assertDatabaseHas('medicine_brands', ['id' => $brand->id, 'is_available' => false]);
    }

    public function test_available_only_filter_excludes_out_of_stock(): void
    {
        $this->seedMedicines();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->getJson('/api/medicines?available_only=1')
            ->assertStatus(200)
            ->assertJsonCount(2, 'data'); // Metformin is out of stock
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/medicines')->assertStatus(401);
    }

    public function test_pharmacist_can_toggle_availability(): void
    {
        $this->seedMedicines();
        $medicine = Medicine::where('generic_name', 'Paracetamol')->first();
        $pharmacist = $this->user('pharmacist');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}/availability", ['is_available' => false])
            ->assertStatus(200)
            ->assertJsonPath('is_available', false);

        $this->assertDatabaseHas('medicines', ['id' => $medicine->id, 'is_available' => false]);
    }

    public function test_admin_can_toggle_availability(): void
    {
        $this->seedMedicines();
        $medicine = Medicine::where('generic_name', 'Metformin')->first();
        $admin = $this->user('admin');

        $this->actingAs($admin, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}/availability", ['is_available' => true])
            ->assertStatus(200)
            ->assertJsonPath('is_available', true);
    }

    public function test_doctor_cannot_toggle_availability(): void
    {
        $this->seedMedicines();
        $medicine = Medicine::where('generic_name', 'Paracetamol')->first();
        $doctorUser = $this->makeDoctor()['user'];

        $this->actingAs($doctorUser, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}/availability", ['is_available' => false])
            ->assertStatus(403);
    }

    public function test_availability_requires_boolean(): void
    {
        $this->seedMedicines();
        $medicine = Medicine::where('generic_name', 'Paracetamol')->first();
        $pharmacist = $this->user('pharmacist');

        $this->actingAs($pharmacist, 'sanctum')
            ->putJson("/api/medicines/{$medicine->id}/availability", [])
            ->assertStatus(422);
    }
}
