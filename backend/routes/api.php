<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FactureController;
use App\Http\Controllers\MongoController;
use App\Http\Controllers\MongoController2;
use Illuminate\Support\Facades\Route;

// Public: the only unauthenticated endpoint.
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth.token')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Used by both dashboards (admin tree and nurse/lespages tree).
    Route::middleware('role:admin,infirmier')->group(function () {
        Route::get('/all', [MongoController::class, 'getAllPosts']);
        Route::get('/getdata', [MongoController::class, 'checkdta']);
        Route::get('/getsuivi', [MongoController::class, 'cheksuivi']);
        Route::get('/getAllRdv', [MongoController2::class, 'getAllRdv']);
        Route::get('/getSalle', [MongoController2::class, 'getSalle']);
        Route::get('/patients/{id}', [MongoController2::class, 'showPatient'])->middleware('object.id:id');
        Route::get('/factures', [FactureController::class, 'index']);
        Route::post('/factures', [FactureController::class, 'store']);
        Route::get('/factures/{id}', [FactureController::class, 'show'])->middleware('object.id:id');
        Route::post('/factures/{id}/paiements', [FactureController::class, 'pay'])->middleware('object.id:id');
        Route::post('/Posts', [MongoController2::class, 'createPost']);

        Route::put('/modifierPatient/{id}', [MongoController2::class, 'modifierPatient'])->middleware('object.id:id');
        Route::put('/RendezVous/{id}', [MongoController2::class, 'RendezVous'])->middleware('object.id:id');
        Route::put('/salle/{id}', [MongoController2::class, 'salle'])->middleware('object.id:id');
        Route::put('/deleteSalle/{identite}', [MongoController2::class, 'deleteSalle'])->middleware('object.id:identite');
        // The nurse patients page calls this one (lespages/patients.jsx).
        Route::delete('/deletePatient/{identite}', [MongoController2::class, 'deletePatient'])->middleware('object.id:identite');
    });

    // Admin-only: staff management, visit records, and destructive routes
    // that the nurse UI does not call.
    Route::middleware('role:admin')->group(function () {
        Route::get('/allemplo', [MongoController::class, 'getAllEmployee']);
        Route::post('/Postmedcin', [MongoController::class, 'Postmedecin']);
        Route::put('/update/{nom}', [MongoController::class, 'update']);
        Route::delete('/delete/{nom}', [MongoController::class, 'Delete']);
        Route::post('/factures/{id}/annuler', [FactureController::class, 'cancel'])->middleware('object.id:id');

        Route::put('/add/{id}', [MongoController::class, 'adddata'])->middleware('object.id:id');
        Route::put('/insertsuivi/{id}', [MongoController::class, 'insertsuivii']);
        Route::put('/updatesuivie/{id}', [MongoController::class, 'updatesuivie']);
        Route::put('/deletesuivie/{id}', [MongoController::class, 'deletesuivie'])->middleware('object.id:id');
        Route::delete('/deletevisit/{id}', [MongoController::class, 'deleteVisit'])->middleware('object.id:id');
    });
});
