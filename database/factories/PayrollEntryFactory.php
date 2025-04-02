<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use Carbon\Carbon;

class PayrollEntryFactory extends Factory
{
    public function definition()
    {
        // Ensure we have required records
        $employee = Employee::inRandomOrder()->first() ?? Employee::factory()->create();
        $payrollPeriod = PayrollPeriod::inRandomOrder()->first() ?? PayrollPeriod::factory()->create();

        // Calculations
        $workDays = $this->calculateWorkDays($payrollPeriod->period_start, $payrollPeriod->period_end);
        $grossPay = ($employee->daily_rate ?? 500) * $workDays;
        
        // Deductions (Philippines specific)
        $sss = min(1350, max(400, $grossPay * 0.045));
        $philhealth = round($grossPay * 0.04, 2);
        $pagibig = $grossPay >= 5000 ? 100 : round($grossPay * 0.02, 2);
        $tax = $this->calculateTax($grossPay - ($sss + $philhealth + $pagibig));
        
        // Other random deductions
        $cashAdvance = rand(0, min(1000, $grossPay * 0.2));
        $loan = rand(0, min(1000, $grossPay * 0.2));
        $otherDeductions = rand(0, 300);
        $vat = rand(0, 100);
        $short = rand(0, 100); // Random short amount (not included in deductions)
        
        // Totals
        $totalDeductions = $sss + $philhealth + $pagibig + $tax + $cashAdvance + $loan + $vat + $otherDeductions;
        $netPay = $grossPay - $totalDeductions;

        return [
            'employee_number' => $employee->employee_number,
            'week_id' => $payrollPeriod->week_id,
            
            // Payroll details
            'daily_rate' => $employee->daily_rate ?? 500,
            'gross_pay' => round($grossPay, 2),
            'sss_deduction' => round($sss, 2),
            'philhealth_deduction' => round($philhealth, 2),
            'pagibig_deduction' => round($pagibig, 2),
            'tax_deduction' => round($tax, 2),
            'cash_advance' => round($cashAdvance, 2),
            'loan' => round($loan, 2),
            'vat' => round($vat, 2),
            'other_deductions' => round($otherDeductions, 2),
            'short' => round($short, 2),
            // Remove this line: 'net_pay' => round($netPay, 2),
            'ytd_earnings' => round($grossPay + rand(0, 50000), 2),
            'thirteenth_month_pay' => round(($grossPay + rand(0, 50000)) / 12, 2),
            'status' => $this->faker->randomElement(['Pending', 'Approved', 'Paid']),
        ];
    }

    private function calculateWorkDays($start, $end)
    {
        $days = 0;
        $current = Carbon::parse($start);
        $end = Carbon::parse($end);
        
        while ($current <= $end) {
            if (!$current->isWeekend()) $days++;
            $current->addDay();
        }
        
        return $days;
    }

    private function calculateTax($income)
    {
        $income = max(0, $income);
        if ($income <= 20833) return 0;
        if ($income <= 33333) return ($income - 20833) * 0.20;
        if ($income <= 66667) return 2500 + ($income - 33333) * 0.25;
        if ($income <= 166667) return 10833 + ($income - 66667) * 0.30;
        if ($income <= 666667) return 40833 + ($income - 166667) * 0.32;
        return 200833 + ($income - 666667) * 0.35;
    }
}