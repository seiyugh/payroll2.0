<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;

class AdminController extends Controller
{
    public function manageUsers()
    {
        return response()->json(User::all());
    }

    public function settings()
    {
        return response()->json(['settings' => 'Here are system settings']);
    }
}
