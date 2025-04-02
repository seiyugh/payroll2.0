<?php

// database/seeders/EmployeeSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Employee;

class EmployeeSeeder extends Seeder
{
    public function run()
    {
        // Seed employees
        Employee::factory(50)->create(); // Creates 50 fake employees for testing
    }
}