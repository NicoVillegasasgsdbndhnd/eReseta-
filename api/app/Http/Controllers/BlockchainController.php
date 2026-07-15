<?php

namespace App\Http\Controllers;

use App\Models\Prescription;
use App\Models\PrescriptionEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class BlockchainController extends Controller
{





    public function activity(Request $request): JsonResponse
    {
        abort_if(! $request->user()->hasRole('admin'), 403, 'Only administrators can view the blockchain explorer.');

        $gatewayUrl = config('services.fabric.gateway_url', env('FABRIC_GATEWAY_URL', 'http://localhost:3001'));
        $enabled    = (bool) config('services.fabric.enabled', env('BLOCKCHAIN_ENABLED', false));



        $online = Cache::remember('bc_gateway_online', 5, function () use ($gatewayUrl): bool {
            try {
                Http::timeout(1)->get($gatewayUrl);
                return true;
            } catch (\Throwable) {
                return false;
            }
        });

        $recent = PrescriptionEvent::with(['prescription:id,reference_no', 'actor:id,name'])
            ->orderByDesc('id')
            ->limit(30)
            ->get()
            ->map(fn (PrescriptionEvent $e): array => [
                'id'               => $e->id,
                'prescription_id'  => $e->prescription_id,
                'reference_no'     => $e->prescription?->reference_no,
                'event_type'       => $e->event_type,
                'actor'            => $e->actor?->name,
                'occurred_at'      => $e->occurred_at,
                'blockchain_tx_id' => $e->blockchain_tx_id,
            ]);

        return response()->json([
            'status' => [
                'enabled'     => $enabled,
                'online'      => $online,
                'gateway_url' => $gatewayUrl,
                'channel'     => config('services.fabric.channel', 'ereseta-channel'),
                'chaincode'   => config('services.fabric.chaincode', 'prescription'),
            ],
            'stats' => [
                'anchored_prescriptions' => Prescription::whereNotNull('blockchain_tx_id')->count(),
                'total_prescriptions'    => Prescription::count(),
                'anchored_events'        => PrescriptionEvent::whereNotNull('blockchain_tx_id')->count(),
                'total_events'           => PrescriptionEvent::count(),
            ],
            'recent' => $recent,
        ]);
    }

    /**
     * Lightweight blockchain health flag for clinical users (doctors/pharmacists).
     * Just enabled + online — no explorer data. Used to show a "blockchain offline" notice.
     */
    public function status(Request $request): JsonResponse
    {
        $gatewayUrl = config('services.fabric.gateway_url', env('FABRIC_GATEWAY_URL', 'http://localhost:3001'));
        $enabled    = (bool) config('services.fabric.enabled', env('BLOCKCHAIN_ENABLED', false));

        $online = Cache::remember('bc_gateway_online', 5, function () use ($gatewayUrl): bool {
            try {
                Http::timeout(1)->get($gatewayUrl);
                return true;
            } catch (\Throwable) {
                return false;
            }
        });

        return response()->json([
            'enabled' => $enabled,
            'online'  => $online,
        ]);
    }
}
