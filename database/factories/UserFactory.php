<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition()
    {
        return [
            'username' => $this->faker->unique()->userName,
            'password_hash' => bcrypt('password'),
            'full_name' => $this->faker->name,
            'user_type' => 'employee',
            'employee_number' => Employee::inRandomOrder()->first()->employee_number,
            'last_login' => $this->faker->dateTime(),
            'is_active' => true,
        ];
    }
}
