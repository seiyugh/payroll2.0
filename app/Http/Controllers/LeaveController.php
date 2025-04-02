<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\LeaveRequest;

class LeaveController extends Controller
{
    public function index()
    {
        return response()->json(LeaveRequest::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'employee_id' => 'required|exists:users,id',
            'leave_type' => 'required|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $leave = LeaveRequest::create($request->all());

        return response()->json($leave, 201);
    }

    public function approve($id)
    {
        $leave = LeaveRequest::findOrFail($id);
        $leave->update(['status' => 'approved']);

        return response()->json(['message' => 'Leave approved']);
    }

    public function reject($id)
    {
        $leave = LeaveRequest::findOrFail($id);
        $leave->update(['status' => 'rejected']);

        return response()->json(['message' => 'Leave rejected']);
    }
}
