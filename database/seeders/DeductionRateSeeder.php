<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\DeductionRate;

class DeductionRateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DeductionRate::factory()->count(50)->create(); // Generates 50 fake records
    }
}