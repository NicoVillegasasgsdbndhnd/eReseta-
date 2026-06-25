<?php

return [
    'paths'                    => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods'          => ['*'],
    'allowed_origins'          => array_filter([
        env('FRONTEND_URL', 'http://localhost:5173'),
        'http://localhost:5174',  // Vite fallback port when 5173 is taken
        'http://localhost:4173',  // Vite preview
    ]),
    'allowed_origins_patterns' => [
        '#^http://192\.168\.\d{1,3}\.\d{1,3}:(5173|5174|4173)$#',
        '#^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(5173|5174|4173)$#',
        '#^http://172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}:(5173|5174|4173)$#',
    ],
    'allowed_headers'          => ['*'],
    'exposed_headers'          => [],
    'max_age'                  => 0,
    'supports_credentials'     => true,
];
