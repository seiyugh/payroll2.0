<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    // Fix the table name to match the actual database table
    protected $table = 'attendance';

    protected $fillable = [
        'employee_number',
        'work_date',
        'daily_rate',
        'adjustment',
        'status',
    ];

    protected $casts = [
        'work_date' => 'date',
        'daily_rate' => 'decimal:2',
        'adjustment' => 'decimal:2',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_number', 'employee_number');
    }
}

