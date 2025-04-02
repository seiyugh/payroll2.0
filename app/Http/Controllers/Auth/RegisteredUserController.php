<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
   public function store(Request $request)
{
    $validated = $request->validate([
        'employee_number' => 'required|unique:users,employee_number',
        'full_name' => 'required|string',
        'username' => 'required|unique:users,username',
        'user_type' => 'required',
        'password' => 'required|min:6',
    ]);

    // Create user (without logging in)
    User::create([
        'employee_number' => $validated['employee_number'],
        'full_name' => $validated['full_name'],
        'username' => $validated['username'],
        'user_type' => $validated['user_type'],
        'password_hash' => bcrypt($validated['password']),
    ]);

    // **Redirect to login page**
    return redirect()->route('login')->with('status', 'Account created successfully. Please log in.');
}


}
