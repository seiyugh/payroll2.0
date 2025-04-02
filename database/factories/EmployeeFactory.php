<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class EmployeeFactory extends Factory
{
    protected $model = Employee::class;

    public function definition()
    {
        $positions = [
            'Driver' => 600,
            'Driver/Technician' => 700,
            'Supervisor' => 900,
            'Manager' => 1200,
            'Admin Staff' => 500
        ];
        
        $position = $this->faker->randomElement(array_keys($positions));
        $rate = $positions[$position];
    
        $dateHired = $this->faker->dateTimeBetween('-5 years', '-6 months');
        $yearsOfService = now()->diffInYears($dateHired);
    
        $birthdate = $this->faker->dateTimeBetween('-50 years', '-20 years');
        $age = now()->diffInYears($birthdate);
    
        // Handle nullable date_terminated_resigned properly
        $terminationDate = $this->faker->optional(0.1)->dateTimeBetween($dateHired, 'now');
        $formattedTerminationDate = $terminationDate ? $terminationDate->format('Y-m-d') : null;
    
        return [
            'employee_number' => now()->year . '-' . str_pad($this->faker->unique()->numberBetween(1, 999), 3, '0', STR_PAD_LEFT),
            'full_name' => $this->faker->name,
            'last_name' => $this->faker->lastName,
            'first_name' => $this->faker->firstName,
            'middle_name' => $this->faker->optional()->lastName,
            'address' => $this->faker->address,
            'position' => $position,
            'department' => $this->faker->randomElement(['Admin', 'Technician', 'Allen One']),
            'date_hired' => $dateHired->format('Y-m-d'),
            'years_of_service' => $yearsOfService,
            'employment_status' => ($yearsOfService > 1) ? 'Regular' : 'Probationary',
            'daily_rate' => $rate,
            'date_terminated_resigned' => $formattedTerminationDate, // Use the properly formatted nullable date
            'sss_no' => $this->faker->unique()->regexify('[0-9]{10}'),
            'tin_no' => $this->faker->unique()->regexify('[0-9]{9}'),
            'philhealth_no' => $this->faker->unique()->regexify('[0-9]{12}'),
            'pagibig_no' => $this->faker->unique()->regexify('[0-9]{12}'),
            'birthdate' => $birthdate->format('Y-m-d'),
            'age' => $age,
            'civil_status' => $this->faker->randomElement(['single', 'married', 'widowed']),
            'gender' => $this->faker->randomElement(['male', 'female']),
            'contacts' => $this->faker->e164PhoneNumber,
            'emergency_contact_name' => $this->faker->name,
            'emergency_contact_mobile' => $this->faker->numerify('09#########'),
            'created_at' => $dateHired,
            'updated_at' => $dateHired,
        ];
    }
}