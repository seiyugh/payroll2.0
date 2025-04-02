<?php

// database/seeders/UserSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Seed 10 users
        User::factory(10)->create(); // Adjust number based on how many users you want to generate
    }
}