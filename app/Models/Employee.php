<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_number',
        'full_name',
        'last_name',
        'first_name',
        'middle_name',
        'id_no',
        'gender',
        'civil_status',
        'position',
        'department',
        'assigned_area',
        'address',
        'age',
        'birthdate',
        'birth_place',
        'contacts',
        'date_hired',
        'years_of_service',
        'employment_status',
        'daily_rate',
        'date_terminated_resigned',
        'sss_no',
        'tin_no',
        'philhealth_no',
        'pagibig_no',
        'ub_account',
        'emergency_contact_name',
        'emergency_contact_mobile',
        'email',
        'resume',
        'id_status',
        'government_id',
        'type_of_id',
        'clearance',
        'id_number',
        'staff_house',
        'birth_certificate',
        'marriage_certificate',
        'tor',
        'diploma_hs_college',
        'contract',
        'performance_evaluation',
        'medical_cert',
        'remarks'
    ];

    protected $casts = [
        'government_id' => 'boolean',
        'staff_house' => 'boolean',
        'birth_certificate' => 'boolean',
        'marriage_certificate' => 'boolean',
        'tor' => 'boolean',
        'diploma_hs_college' => 'boolean',
        'performance_evaluation' => 'boolean',
        'medical_cert' => 'boolean',
        'resume' => 'boolean',
        'birthdate' => 'date',
        'date_hired' => 'date',
        'date_terminated_resigned' => 'date',
        'date_of_regularization' => 'date'
    ];

    public function payrollEntries(): HasMany
    {
        return $this->hasMany(PayrollEntry::class, 'employee_number', 'employee_number');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'employee_number', 'employee_number');
    }
}

