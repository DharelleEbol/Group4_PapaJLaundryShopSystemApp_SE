<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ClientAuthController extends Controller
{
    /**
     * Register a new client and return a token.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:clients,email',
            'password' => 'required|string|min:6|confirmed',
            'device_name' => 'nullable|string', // optional
        ]);

        $client = Client::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        // create token with optional device name
        $device = $data['device_name'] ?? 'mobile';
        $token = $client->createToken($device)->plainTextToken;

        return response()->json([
            'client' => $client,
            'token' => $token,
        ], 201);
    }

    /**
     * Login an existing client and return a token.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
            'device_name' => 'nullable|string',
        ]);

        $client = Client::where('email', $request->email)->first();

        if (! $client || ! Hash::check($request->password, $client->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $device = $request->device_name ?? 'mobile';
        $token = $client->createToken($device)->plainTextToken;

        return response()->json([
            'client' => $client,
            'token' => $token,
        ], 200);
    }

    /**
     * Return the authenticated client.
     * Protect this route with auth:sanctum middleware.
     */
    public function me(Request $request)
    {
        return response()->json($request->user(), 200);
    }

    /**
     * Logout current token (logs out this device).
     * Protect this route with auth:sanctum middleware.
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        return response()->json(['message' => 'Logged out'], 200);
    }

    /**
     * Logout everywhere (revoke all tokens).
     * Protect this route with auth:sanctum middleware.
     */
    public function logoutAll(Request $request)
    {
        $user = $request->user();
        if ($user) {
            $user->tokens()->delete();
        }

        return response()->json(['message' => 'Logged out from all devices'], 200);
    }
}
