<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Attendance;
use App\Models\PayrollEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        try {
            // Get total employees
            $total_employees = Employee::count();
            
            // Get pending payrolls with employee names
            $pending_payrolls = PayrollEntry::where('status', 'pending')
                ->with('employee')
                ->count();
            
            // Get attendance summary
            $today = Carbon::today();
            
            try {
                $present_today = Attendance::where('work_date', $today)
                    ->where('status', 'Present')
                    ->count();
            } catch (\Exception $e) {
                $present_today = 0;
            }
            
            $attendance_summary = [
                'total' => $total_employees,
                'ongoing' => $present_today
            ];
            
            // Get upcoming pay dates with employee names
            $upcoming_pay_dates = PayrollEntry::where('status', 'pending')
                ->with(['employee' => function($query) {
                    $query->select('id', 'employee_number', 'first_name', 'last_name');
                }])
                ->orderBy('created_at', 'asc')
                ->take(3)
                ->get()
                ->map(function ($entry) {
                    return [
                        'id' => $entry->id,
                        'employee_name' => $entry->employee ? $entry->employee->first_name . ' ' . $entry->employee->last_name : 'Unknown',
                        'employee_number' => $entry->employee ? $entry->employee->employee_number : '',
                        'date' => $entry->created_at ? $entry->created_at->format('Y-m-d') : null,
                        'amount' => $entry->net_pay
                    ];
                });
            
            // Get recent transactions with employee names
            $recent_transactions = PayrollEntry::with(['employee' => function($query) {
                    $query->select('id', 'employee_number', 'first_name', 'last_name');
                }])
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get()
                ->map(function ($entry) {
                    return [
                        'payroll_entry_id' => $entry->id,
                        'employee_name' => $entry->employee ? $entry->employee->first_name . ' ' . $entry->employee->last_name : 'Unknown',
                        'employee_number' => $entry->employee ? $entry->employee->employee_number : '',
                        'date' => $entry->created_at ? $entry->created_at->format('Y-m-d') : date('Y-m-d'),
                        'amount' => $entry->net_pay,
                        'status' => $entry->status
                    ];
                });
            
            // Sample data for charts
            $attendance_data = [70, 75, 68, 80, 82, 75, 78];
            $payroll_data = [5000, 5200, 5100, 5300, 5250, 5400, 5500];
            $employee_growth_data = [120, 125, 130, 135, 140, 145, 150];
            
            // Quick stats
            $quick_stats = [
                [
                    'label' => 'Attendance Rate',
                    'value' => '78%',
                    'change' => '+3%',
                    'icon' => 'CheckCircle',
                    'color' => 'text-green-500'
                ],
                [
                    'label' => 'Avg. Daily Rate',
                    'value' => '$' . (Employee::avg('daily_rate') ?: 0),
                    'change' => '+$5',
                    'icon' => 'TrendingUp',
                    'color' => 'text-indigo-500'
                ],
                [
                    'label' => 'Pending Requests',
                    'value' => $pending_payrolls,
                    'change' => '-2',
                    'icon' => 'Clock',
                    'color' => 'text-amber-500'
                ],
                [
                    'label' => 'Compliance',
                    'value' => '95%',
                    'change' => '+1%',
                    'icon' => 'AlertCircle',
                    'color' => 'text-blue-500'
                ]
            ];
            
            // Upcoming tasks
            $upcoming_tasks = [
                [
                    'id' => 1,
                    'title' => 'Process Monthly Payroll',
                    'due' => Carbon::now()->addDays(3)->format('M d'),
                    'priority' => 'High'
                ],
                [
                    'id' => 2,
                    'title' => 'Review Attendance Records',
                    'due' => Carbon::now()->addDays(5)->format('M d'),
                    'priority' => 'Medium'
                ],
                [
                    'id' => 3,
                    'title' => 'Update Employee Benefits',
                    'due' => Carbon::now()->addDays(7)->format('M d'),
                    'priority' => 'Low'
                ]
            ];
            
            return Inertia::render('Dashboard', [
                'total_employees' => $total_employees,
                'pending_payrolls' => $pending_payrolls,
                'attendance_summary' => $attendance_summary,
                'upcoming_pay_dates' => $upcoming_pay_dates,
                'recent_transactions' => $recent_transactions,
                'attendance_data' => $attendance_data,
                'payroll_data' => $payroll_data,
                'employee_growth_data' => $employee_growth_data,
                'quick_stats' => $quick_stats,
                'upcoming_tasks' => $upcoming_tasks
            ]);
        } catch (\Exception $e) {
            return Inertia::render('Dashboard', [
                'error' => 'There was an error loading the dashboard data: ' . $e->getMessage(),
                'total_employees' => Employee::count() ?: 0,
                'pending_payrolls' => 0,
                'attendance_summary' => ['total' => 0, 'ongoing' => 0],
                'upcoming_pay_dates' => [],
                'recent_transactions' => [],
                'attendance_data' => [0, 0, 0, 0, 0, 0, 0],
                'payroll_data' => [0, 0, 0, 0, 0, 0, 0],
                'employee_growth_data' => [0, 0, 0, 0, 0, 0, 0],
                'quick_stats' => [],
                'upcoming_tasks' => []
            ]);
        }
    }
}