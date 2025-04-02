<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attendance;
use App\Models\Employee;
use Carbon\Carbon;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $employees = Employee::all();
        $startDate = Carbon::now()->subMonth(); // 1 month back
        $endDate = Carbon::now();

        foreach ($employees as $employee) {
            for ($date = $startDate; $date <= $endDate; $date->addDay()) {
                // Check if the record already exists
                if (!Attendance::where('employee_number', $employee->employee_number)
                    ->where('work_date', $date->format('Y-m-d'))
                    ->exists()) {

                    $dayOfWeek = $date->format('N'); // 1 (Mon) - 7 (Sun)
                    $status = $dayOfWeek <= 5 ? 'Present' : 'Day Off'; // Workdays are Mon-Fri
                    $dailyRate = ($status === 'Present') ? 600 + random_int(0, 100) : 0;
                    $adjustment = $status === 'Present' && random_int(0, 100) < 15 ? random_int(-100, 200) : 0;

                    Attendance::create([
                        'employee_number' => $employee->employee_number,
                        'work_date' => $date->format('Y-m-d'),
                        'daily_rate' => $dailyRate,
                        'adjustment' => $adjustment,
                        'status' => $status,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }
}
