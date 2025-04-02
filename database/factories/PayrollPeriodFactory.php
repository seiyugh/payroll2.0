<?php

namespace Database\Factories;

use App\Models\PayrollPeriod;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

class PayrollPeriodFactory extends Factory
{
    protected $model = PayrollPeriod::class;

    public function definition()
    {
        // Get the most recent payroll period
        $lastPeriod = PayrollPeriod::latest('period_end')->first();

        if ($lastPeriod) {
            // Start new period the day after the last period ended
            $periodStart = Carbon::parse($lastPeriod->period_end)->addDay();
        } else {
            // Start from the first Monday of the current year if no existing records
            $periodStart = Carbon::now()->startOfYear()->next(Carbon::MONDAY);
        }

        // Ensure period starts on Monday
        if (!$periodStart->isMonday()) {
            $periodStart = $periodStart->next(Carbon::MONDAY);
        }

        // Payroll period runs from Monday to Sunday
        $periodEnd = $periodStart->copy()->next(Carbon::SUNDAY);

        // Payment date is always the Thursday after the payroll period ends
        $paymentDate = $periodEnd->copy()->addDays(4);

        // Compute the week_id (YEARWEEK format)
        $weekId = $periodStart->format('oW'); // "o" gives ISO-8601 year, "W" gives the week number

        return [
            'period_start' => $periodStart->format('Y-m-d'),
            'period_end' => $periodEnd->format('Y-m-d'),
            'week_id' => $weekId,
            'payment_date' => $paymentDate->format('Y-m-d'),
            'status' => $paymentDate->isPast() ? 'closed' : 'open',
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
