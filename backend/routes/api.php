<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DraftController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);
Route::get('/catalog', [DraftController::class, 'catalog']);
Route::get('/agent/status', [AgentController::class, 'status']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/logout', [AuthController::class, 'logout']);

Route::middleware(['token', 'throttle:120,1'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/audit', [DraftController::class, 'audit']);

    Route::middleware('role:admin,bd,reviewer')->group(function () {
        Route::post('/draft', [DraftController::class, 'store'])->middleware('throttle:30,1');
        Route::post('/export', [DraftController::class, 'export'])->middleware('throttle:30,1');
        Route::post('/agent', [AgentController::class, 'send'])->middleware('throttle:30,1');
    });
});
