<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;
use App\Models\User;
use App\Models\PayrollPeriod;
use App\Models\Attendance;
use App\Models\PayrollEntry;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Create 100 employees
        $employees = Employee::factory()->count(1)->create();
        
        // Create users for each employee
        foreach ($employees as $employee) {
            User::factory()->create([
                'employee_number' => $employee->employee_number,
                'full_name' => $employee->full_name,
                'user_type' => 'employee'
            ]);
        }

        // Create payroll periods from December 2023 to now (weekly)
        $startDate = Carbon::create(2023, 12, 4);
        $endDate = Carbon::now();
        
        $currentDate = $startDate->copy();
        while ($currentDate <= $endDate) {
            // Ensure period starts on Monday
            if (!$currentDate->isMonday()) {
                $currentDate->next(Carbon::MONDAY);
                continue; // Skip to next iteration after adjusting date
            }
            
            $periodEnd = $currentDate->copy()->next(Carbon::SUNDAY);
            $paymentDate = $periodEnd->copy()->addDays(4);
            
            // Generate week_id for checking
            $weekId = date('oW', strtotime($currentDate));
            
            // Only create if week_id doesn't exist
            if (!PayrollPeriod::where('week_id', $weekId)->exists()) {
                PayrollPeriod::factory()->create([
                    'period_start' => $currentDate->format('Y-m-d'),
                    'period_end' => $periodEnd->format('Y-m-d'),
                    'payment_date' => $paymentDate->format('Y-m-d'),
                    'status' => $paymentDate->isPast() ? 'closed' : 'open',
                    'created_at' => $currentDate,
                    'updated_at' => $currentDate,
                ]);
            }
            
            $currentDate = $periodEnd->copy()->addDay();
        }

        // Create attendance records for each employee
        $employees->each(function ($employee) use ($startDate, $endDate) {
            $currentDate = $startDate->copy();
            
            while ($currentDate <= $endDate) {
                // Skip weekends (Saturday and Sunday)
                if (!$currentDate->isWeekend()) {
                    Attendance::factory()->create([
                        'employee_number' => $employee->employee_number,
                        'work_date' => $currentDate->format('Y-m-d'),
                        'created_at' => $currentDate,
                        'updated_at' => $currentDate,
                    ]);
                }
                
                $currentDate->addDay();
            }
        });

        // Create payroll entries for each employee and payroll period
        $payrollPeriods = PayrollPeriod::all();
        
        $employees->each(function ($employee) use ($payrollPeriods) {
            $payrollPeriods->each(function ($period) use ($employee) {
                // Check if entry already exists
                if (!PayrollEntry::where([
                    'employee_number' => $employee->employee_number,
                    'week_id' => $period->week_id
                ])->exists()) {
                    
                    PayrollEntry::factory()->create([
                        'employee_number' => $employee->employee_number,
                        'week_id' => $period->week_id, // Using week_id instead of payroll_period_id
                        'created_at' => $period->payment_date,
                        'updated_at' => $period->payment_date,
                    ]);
                }
            });
        });
    }
}