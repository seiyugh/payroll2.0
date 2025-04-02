<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollPeriod extends Model
{
    use HasFactory;

    protected $fillable = [
        'period_start',
        'period_end',
        'payment_date',
        'status',
        'week_id', // Make sure week_id is fillable
    ];

    /**
     * Automatically set `week_id` before creating a new payroll period.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payrollPeriod) {
            // Generate the week_id (ISO year + week number)
            $weekId = date('oW', strtotime($payrollPeriod->period_start));

            // Check if this `week_id` already exists
            if (self::where('week_id', $weekId)->exists()) {
                throw new \Exception("Payroll period for Week ID {$weekId} already exists.");
            }

            $payrollPeriod->week_id = $weekId;
        });
    }

    /**
     * Get the payroll entries for this period.
     * Changed to use week_id as the foreign key
     */
    public function payrollEntries(): HasMany
    {
        return $this->hasMany(PayrollEntry::class, 'week_id', 'week_id');
    }
}