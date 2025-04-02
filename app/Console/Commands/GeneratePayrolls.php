<?php

namespace App\Console\Commands;

use App\Models\Employee;
use App\Models\PayrollPeriod;
use App\Models\PayrollEntry;
use App\Mail\PayslipMail;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class GeneratePayrolls extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payroll:generate {--period_id=} {--send-email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate payrolls for employees at the end of a payroll period';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting payroll generation process...');
        
        try {
            // Check if a specific period ID was provided
            $periodId = $this->option('period_id');
            $sendEmail = $this->option('send-email');
            
            if ($periodId) {
                // Process specific period
                $periods = PayrollPeriod::where('id', $periodId)->get();
                $this->info("Processing specific payroll period ID: {$periodId}");
            } else {
                // Find periods that ended today
                $today = Carbon::today()->format('Y-m-d');
                $periods = PayrollPeriod::where('period_end', $today)
                    ->where('status', '!=', 'Completed')
                    ->get();
                
                $this->info("Found " . count($periods) . " ending payroll period(s) for today ({$today})");
            }
            
            if ($periods->isEmpty()) {
                $this->info('No payroll periods to process.');
                return 0;
            }
            
            foreach ($periods as $period) {
                $this->info("Processing payroll period: {$period->id} ({$period->period_start} to {$period->period_end})");
                
                // Get all employees
                $employees = Employee::all();
                $this->info("Found " . count($employees) . " employees to process");
                
                $bar = $this->output->createProgressBar(count($employees));
                $bar->start();
                
                foreach ($employees as $employee) {
                    // Check if payroll already exists for this employee and period
                    $existingPayroll = PayrollEntry::where('employee_number', $employee->employee_number)
                        ->where('payroll_period_id', $period->id)
                        ->first();
                    
                    if ($existingPayroll) {
                        $this->info("Payroll already exists for employee {$employee->employee_number} in this period. Skipping.");
                        $bar->advance();
                        continue;
                    }
                    
                    // Generate payroll for this employee
                    $payroll = $this->generatePayrollForEmployee($employee, $period);
                    
                    // Send email if requested
                    if ($sendEmail && $payroll && !empty($employee->email)) {
                        $this->sendPayslipEmail($employee, $payroll);
                    }
                    
                    $bar->advance();
                }
                
                $bar->finish();
                $this->newLine();
                
                // Update period status to Completed
                $period->status = 'Completed';
                $period->save();
                $this->info("Payroll period {$period->id} marked as Completed");
            }
            
            $this->info('Payroll generation completed successfully!');
            return 0;
            
        } catch (\Exception $e) {
            $this->error('Error generating payrolls: ' . $e->getMessage());
            Log::error('Payroll generation error: ' . $e->getMessage());
            return 1;
        }
    }
    
    /**
     * Generate payroll for a specific employee
     */
    private function generatePayrollForEmployee($employee, $period)
    {
        try {
            // Calculate start and end dates
            $startDate = Carbon::parse($period->period_start);
            $endDate = Carbon::parse($period->period_end);
            
            // Generate daily rates for each day in the period
            $dailyRates = [];
            $currentDate = clone $startDate;
            $totalDays = 0;
            
            while ($currentDate <= $endDate) {
                // Skip weekends if needed (optional)
                // if ($currentDate->isWeekend()) {
                //     $currentDate->addDay();
                //     continue;
                // }
                
                // Get daily rate from employee record
                $dailyRate = $employee->daily_rate ?? 545.15; // Default rate if not set
                
                // Add to daily rates array
                $dailyRates[] = [
                    'date' => $currentDate->format('Y-m-d'),
                    'amount' => (string)$dailyRate,
                    'additional' => '0',
                ];
                
                $totalDays++;
                $currentDate->addDay();
            }
            
            // Calculate gross pay
            $grossPay = $totalDays * ($employee->daily_rate ?? 545.15);
            
            // Calculate deductions
            $sssDeduction = $this->calculateSssDeduction($grossPay);
            $philhealthDeduction = $this->calculatePhilhealthDeduction($grossPay);
            $pagibigDeduction = $this->calculatePagibigDeduction($grossPay);
            
            // Calculate total deductions
            $totalDeductions = $sssDeduction + $philhealthDeduction + $pagibigDeduction;
            
            // Calculate net pay
            $netPay = $grossPay - $totalDeductions;
            
            // Create payroll entry
            $payroll = new PayrollEntry();
            $payroll->employee_number = $employee->employee_number;
            $payroll->payroll_period_id = $period->id;
            $payroll->gross_pay = $grossPay;
            $payroll->sss_deduction = $sssDeduction;
            $payroll->philhealth_deduction = $philhealthDeduction;
            $payroll->pagibig_deduction = $pagibigDeduction;
            $payroll->tax_deduction = 0; // Calculate tax if needed
            $payroll->other_deductions = 0;
            $payroll->total_deductions = $totalDeductions;
            $payroll->net_pay = $netPay;
            $payroll->status = 'Pending';
            $payroll->daily_rates = $dailyRates;
            $payroll->save();
            
            return $payroll;
            
        } catch (\Exception $e) {
            Log::error("Error generating payroll for employee {$employee->employee_number}: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Calculate SSS deduction based on gross pay
     */
    private function calculateSssDeduction($grossPay)
    {
        // Simplified SSS calculation
        if ($grossPay <= 3250) {
            return 135;
        } elseif ($grossPay <= 24750) {
            return $grossPay * 0.045;
        } else {
            return 1125; // Maximum SSS contribution
        }
    }
    
    /**
     * Calculate PhilHealth deduction based on gross pay
     */
    private function calculatePhilhealthDeduction($grossPay)
    {
        // 2% of gross pay, capped at 1800
        return min($grossPay * 0.02, 1800);
    }
    
    /**
     * Calculate Pag-IBIG deduction based on gross pay
     */
    private function calculatePagibigDeduction($grossPay)
    {
        // 2% of gross pay, capped at 100
        return min($grossPay * 0.02, 100);
    }
    
    /**
     * Send payslip email to employee
     */
    private function sendPayslipEmail($employee, PayrollEntry $payroll)
    {
        try {
            Mail::to($employee->email)->send(new PayslipMail($employee, $payroll));
            $this->info("Payslip email sent to {$employee->email}");
            return true;
        } catch (\Exception $e) {
            $this->error("Failed to send payslip email to {$employee->email}: " . $e->getMessage());
            Log::error("Failed to send payslip email to {$employee->email}: " . $e->getMessage());
            return false;
        }
    }
}

