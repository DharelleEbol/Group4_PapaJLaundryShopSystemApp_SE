<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientAuthController;
use App\Http\Controllers\Api\BranchController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Public routes (no auth)
|
*/

// general auth (if you have different auth controller)
Route::post('/login', [AuthController::class, 'login']);

// client registration / login
Route::post('/clients/register', [ClientAuthController::class, 'register']);
Route::post('/clients/login', [ClientAuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protected routes (Sanctum)
|--------------------------------------------------------------------------
|
| These routes require an authenticated client via Sanctum token.
| We attach middleware per-route to avoid accidental static calls.
|
*/

Route::post('/logout', [ClientAuthController::class, 'logout'])->middleware('auth:sanctum');
Route::post('/logout-all', [ClientAuthController::class, 'logoutAll'])->middleware('auth:sanctum');
Route::get('/me', [ClientAuthController::class, 'me'])->middleware('auth:sanctum');

Route::get('/clients/{client}/branches', [BranchController::class, 'index'])->middleware('auth:sanctum');
Route::post('/clients/{client}/branches', [BranchController::class, 'store'])->middleware('auth:sanctum');

Route::get('/branches/{branch}', [BranchController::class, 'show'])->middleware('auth:sanctum');
Route::put('/branches/{branch}', [BranchController::class, 'update'])->middleware('auth:sanctum');
Route::delete('/branches/{branch}', [BranchController::class, 'destroy'])->middleware('auth:sanctum');
