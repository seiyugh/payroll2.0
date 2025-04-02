<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TimeEntry;

class TimeEntrySeeder extends Seeder
{
    public function run()
    {
        TimeEntry::factory(50)->create(); // Adjust the number of entries as needed
    }
}