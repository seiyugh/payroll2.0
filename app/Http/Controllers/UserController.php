<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index()
    {
        $users = User::all();

        return Inertia::render('Users/Index', [
            'users' => $users
        ]);
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'employee_number' => 'required|string|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'user_type' => 'required|string|in:admin,user',
        ]);

        $user = User::create([
            'full_name' => $request->full_name,
            'username' => $request->username,
            'employee_number' => $request->employee_number,
            'password_hash' => Hash::make($request->password),
            'user_type' => $request->user_type,
            'is_active' => true, // Default to active
        ]);

        return redirect()->back()->with('success', 'User created successfully');
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'full_name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->id,
            'user_type' => 'required|string|in:admin,user',
            'is_active' => 'boolean',
        ]);

        // Update user data
        $userData = [
            'full_name' => $request->full_name,
            'username' => $request->username,
            'user_type' => $request->user_type,
            'is_active' => $request->is_active,
        ];

        // If password is provided, update it
        if ($request->filled('password')) {
            $request->validate([
                'password' => ['required', 'confirmed', Rules\Password::defaults()],
            ]);

            $userData['password_hash'] = Hash::make($request->password);
        }

        $user->update($userData);

        return redirect()->back()->with('success', 'User updated successfully');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        // Prevent deleting your own account
        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account');
        }

        // Check if user is associated with an employee
        if ($user->employee) {
            return redirect()->back()->with('error', 'Cannot delete user associated with an employee');
        }

        $user->delete();

        return redirect()->back()->with('success', 'User deleted successfully');
    }
}

