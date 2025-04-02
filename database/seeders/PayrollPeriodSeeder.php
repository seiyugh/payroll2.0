<?php

// database/seeders/PayrollPeriodSeeder.php

namespace Database\Seeders;

use App\Models\PayrollPeriod;
use App\Models\Employee; // Ensure you're using the Employee model
use Illuminate\Database\Seeder;

class PayrollPeriodSeeder extends Seeder
{
    public function run()
    {
        // Fetch a random employee
        $employee = Employee::inRandomOrder()->first();

        // Create payroll periods with the employee_number
        PayrollPeriod::factory()->count(5)->create([
            'employee_number' => $employee->employee_number,
            'period_start' => '2024-08-12',
            'period_end' => '2024-08-26',
            'payment_date' => '2024-08-31',
            'status' => 'closed',
        ]);
    }
}
