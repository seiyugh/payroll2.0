<?php

namespace Database\Factories;

use App\Models\Attendance;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class AttendanceFactory extends Factory
{
    protected $model = Attendance::class;

    public function definition(): array
    {
        $employee = Employee::inRandomOrder()->first();
        $dailyRate = $employee->daily_rate;
        
        // Define status probabilities
        $status = $this->faker->randomElement([
            'Present', 'Present', 'Present', 'Present', 'Present', // 5/8 chance
            'Present', 'Present', 'Present', // Additional weight
            'Half Day', 
            'Absent',
            'Leave',
            'Holiday',
            'WFH',
            'SP',
            'Day Off',
        ]);
        
        $adjustment = 0;

        if ($status === 'Half Day') {
            $dailyRate = $dailyRate / 2;
        } elseif ($status === 'Absent') {
            $dailyRate = 0;
        }

        if ($status === 'Present' && $this->faker->boolean(15)) {
            $adjustment = $this->faker->randomElement([-100, -50, 50, 100, 200]);
        }

        return [
            'employee_number' => $employee->employee_number,
            'work_date' => $this->faker->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'daily_rate' => $dailyRate,
            'adjustment' => $adjustment,
            'status' => $status,
        ];
    }
}