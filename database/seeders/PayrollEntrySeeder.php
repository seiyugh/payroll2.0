<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PayrollEntry;
use App\Models\Employee;
use App\Models\PayrollPeriod;

class PayrollEntrySeeder extends Seeder
{
    public function run()
    {
        // Ensure there are employees in the database
        $employees = Employee::all();

        if ($employees->isEmpty()) {
            $this->command->warn('No employees found! Seeding employees first...');
            \Database\Seeders\EmployeeSeeder::run(); // Ensure employees exist
            $employees = Employee::all();
        }

        // Get all payroll periods
        $payrollPeriods = PayrollPeriod::all();

        if ($payrollPeriods->isEmpty()) {
            $this->command->warn('No payroll periods found! Please seed payroll periods first.');
            return;
        }

        // Generate payroll entries for multiple employees
        foreach ($employees as $employee) {
            $randomPeriod = $payrollPeriods->random(); // Assign a random payroll period

            PayrollEntry::factory()->create([
                'employee_number' => $employee->employee_number,
            ]);
        }
    }
}
