<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // validate (email format + min password length)
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:6'
        ]);

        // find user
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // check password
        if (!Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Incorrect password'], 401);
        }

        // OPTIONAL: create an API token if you want stateless auth (requires Laravel Sanctum or HasApiTokens)
        // $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            // 'token' => $token, // uncomment if using tokens
        ], 200);
    }
}
