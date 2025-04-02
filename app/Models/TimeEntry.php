<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TimeEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_number', 'clock_in', 'clock_out'
    ];

    // Define the relationship with the Employee model using employee_number as the foreign key
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_number', 'employee_number'); 
        // 'employee_number' is the foreign key in time_entries and also the primary key in employees
    }
    
}
