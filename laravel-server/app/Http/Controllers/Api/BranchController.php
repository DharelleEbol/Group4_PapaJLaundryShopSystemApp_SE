<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Log;

class BranchController extends Controller
{
    public function __construct()
    {
        // Require Sanctum authentication for all endpoints in this controller
        $this->middleware('auth:sanctum');
    }

    // List branches for a client (authenticated)
    public function index(Request $request, Client $client)
    {
        $auth = $request->user();

        // Ensure the authenticated client matches the {client} in the URL
        if ($auth->id !== $client->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $branches = $client->branches()->orderBy('created_at', 'desc')->get();
        return response()->json(['data' => $branches], 200);
    }

    // Create a new branch for a client
    public function store(Request $request, Client $client)
    {
        $auth = $request->user();

        // Guard: owner check
        if ($auth->id !== $client->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $data = $request->validate([
                'branch_name' => 'required|string|max:255',
                'username' => [
                    'required','string','max:100',
                    // Use classic closure for compatibility
                    Rule::unique('branches')->where(function ($query) use ($client) {
                        return $query->where('client_id', $client->id);
                    }),
                ],
                'password' => 'required|string|min:6'
            ]);

            $data['password'] = Hash::make($data['password']);
            $data['client_id'] = $client->id;

            $branch = Branch::create($data);

            return response()->json(['data' => $branch], 201);
        } catch (\Throwable $e) {
            // Log the real exception for debugging
            Log::error('Branch::store error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            // Return helpful message in development, generic in production
            return response()->json([
                'message' => 'Server error while creating branch',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // show a branch (ensure it belongs to authenticated client)
    public function show(Request $request, Branch $branch)
    {
        $auth = $request->user();

        if ($branch->client_id !== $auth->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return response()->json(['data' => $branch], 200);
    }

    // update (only if branch belongs to authenticated client)
    public function update(Request $request, Branch $branch)
    {
        $auth = $request->user();

        if ($branch->client_id !== $auth->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $data = $request->validate([
                'branch_name' => 'sometimes|required|string|max:255',
                'username' => [
                    'sometimes','required','string','max:100',
                    // classic closure for compatibility
                    Rule::unique('branches')->ignore($branch->id)->where(function ($q) use ($branch) {
                        return $q->where('client_id', $branch->client_id);
                    }),
                ],
                'password' => 'sometimes|required|string|min:6'
            ]);

            if (isset($data['password'])) {
                $data['password'] = Hash::make($data['password']);
            }

            $branch->update($data);

            return response()->json(['data' => $branch], 200);
        } catch (\Throwable $e) {
            Log::error('Branch::update error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Server error while updating branch',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // destroy (only if branch belongs to authenticated client)
    public function destroy(Request $request, Branch $branch)
    {
        $auth = $request->user();

        if ($branch->client_id !== $auth->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        try {
            $branch->delete();
            return response()->json(['message' => 'Branch deleted'], 200);
        } catch (\Throwable $e) {
            Log::error('Branch::destroy error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'message' => 'Server error while deleting branch',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
