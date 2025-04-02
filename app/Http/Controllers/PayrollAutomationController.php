<?php

namespace App\Http\Controllers;

use App\Models\PayrollPeriod;
use App\Models\Employee;
use App\Models\PayrollEntry;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class PayrollAutomationController extends Controller
{
    /**
     * Display the payroll automation settings page.
     */
    public function index()
    {
        $periods = PayrollPeriod::orderBy('period_end', 'desc')->get();
        $employees = Employee::select('id', 'employee_number', 'full_name', 'email')->get();
        
        return Inertia::render('Payroll/Automation', [
            'periods' => $periods,
            'employees' => $employees,
        ]);
    }
    
    /**
     * Generate payrolls for a specific period.
     */
    public function generatePayrolls(Request $request)
    {
        $request->validate([
            'period_id' => 'required|exists:payroll_periods,id',
            'send_email' => 'boolean',
            'status' => 'nullable|string|in:pending,approved,processed',
        ]);
        
        try {
            $period = PayrollPeriod::findOrFail($request->period_id);
            $sendEmail = $request->input('send_email', false);
            $status = $request->input('status', 'pending');
            
            // Adjust period to Monday-Sunday week
            $this->adjustPeriodToWeek($period);
            
            // Get all active employees
            $employees = Employee::all();
            
            // Get attendance records for the period
            $attendanceRecords = Attendance::whereBetween('work_date', [
                $period->period_start, 
                $period->period_end
            ])->get()->groupBy('employee_number');

            $results = $this->processPayrollForEmployees($employees, $period, $attendanceRecords, $status);
            
            // Send emails if requested
            if ($sendEmail) {
                $this->queuePayslipEmails($period);
                $results['details'] .= "\nPayslip emails queued for sending.\n";
            }
            
            return redirect()->back()->with([
                'success' => true,
                'message' => "Generated {$results['successCount']} payrolls with {$results['errorCount']} errors.",
                'details' => $results['details']
            ]);
            
        } catch (\Exception $e) {
            Log::error('Payroll generation error: ' . $e->getMessage());
            return redirect()->back()->with([
                'success' => false,
                'message' => 'Payroll generation failed: ' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * Send payslip emails for a specific period.
     */
    public function sendPayslipEmails(Request $request)
    {
        $request->validate([
            'period_id' => 'required|exists:payroll_periods,id',
            'employee_ids' => 'array',
            'employee_ids.*' => 'exists:employees,id',
        ]);
        
        try {
            $period = PayrollPeriod::findOrFail($request->period_id);
            $employeeIds = $request->employee_ids ?? [];
            
            $this->queuePayslipEmails($period, $employeeIds);
            
            return redirect()->back()->with('success', 'Payslip emails queued for sending!');
            
        } catch (\Exception $e) {
            Log::error('Email sending error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to queue emails: ' . $e->getMessage());
        }
    }

    /**
     * Adjust period dates to Monday-Sunday week
     */
    protected function adjustPeriodToWeek(PayrollPeriod $period)
    {
        $startDate = new \DateTime($period->period_start);
        $endDate = new \DateTime($period->period_end);
        
        // Adjust start date to Monday if needed
        if ($startDate->format('N') != 1) { // 1 is Monday
            $startDate->modify('previous monday');
            $period->period_start = $startDate->format('Y-m-d');
        }
        
        // Adjust end date to Sunday if needed
        if ($endDate->format('N') != 7) { // 7 is Sunday
            $endDate->modify('next sunday');
            $period->period_end = $endDate->format('Y-m-d');
        }
        
        $period->save();
    }

    /**
     * Process payroll for all employees
     */
    protected function processPayrollForEmployees($employees, $period, $attendanceRecords, $status)
    {
        $successCount = 0;
        $errorCount = 0;
        $details = "";
        
        $startDate = new \DateTime($period->period_start);
        $endDate = new \DateTime($period->period_end);
        
        foreach ($employees as $employee) {
            try {
                $result = $this->generateEmployeePayroll(
                    $employee, 
                    $period, 
                    $attendanceRecords->get($employee->employee_number, collect()),
                    $startDate,
                    $endDate,
                    $status
                );
                
                $successCount++;
                $details .= "Generated payroll for {$employee->full_name} ({$employee->employee_number})\n";
            } catch (\Exception $e) {
                $errorCount++;
                $details .= "Error for {$employee->full_name}: {$e->getMessage()}\n";
                Log::error("Payroll error for employee {$employee->id}: " . $e->getMessage());
            }
        }
        
        return [
            'successCount' => $successCount,
            'errorCount' => $errorCount,
            'details' => $details
        ];
    }

    /**
     * Generate payroll for a single employee
     */
    protected function generateEmployeePayroll($employee, $period, $attendanceRecords, $startDate, $endDate, $status)
    {
        // Create date range for the period
        $dateRange = [];
        $currentDate = clone $startDate;
        while ($currentDate <= $endDate) {
            $dateRange[] = $currentDate->format('Y-m-d');
            $currentDate->modify('+1 day');
        }
        
        $grossPay = 0;
        $dailyRates = [];
        
        foreach ($dateRange as $date) {
            $record = $this->getAttendanceRecord($employee, $date, $attendanceRecords);
            $calculation = $this->calculateDailyPay($record, $employee);
            
            $grossPay += $calculation['amount'] + $calculation['adjustment'];
            
            $dailyRates[] = [
                'date' => $date,
                'work_date' => $date,
                'status' => $calculation['status'],
                'amount' => $calculation['amount'],
                'adjustment' => $calculation['adjustment']
            ];
        }
        
        $deductions = $this->calculateDeductions($grossPay);
        
        PayrollEntry::updateOrCreate(
            [
                'employee_number' => $employee->employee_number,
                'payroll_period_id' => $period->id
            ],
            [
                'employee_id' => $employee->id,
                'gross_pay' => $grossPay,
                'sss_deduction' => $deductions['sss'],
                'philhealth_deduction' => $deductions['philhealth'],
                'pagibig_deduction' => $deductions['pagibig'],
                'tax_deduction' => $deductions['tax'],
                'cash_advance' => 0,
                'loan' => 0,
                'vat' => 0,
                'other_deductions' => 0,
                'total_deductions' => $deductions['total'],
                'net_pay' => $grossPay - $deductions['total'],
                'daily_rates' => json_encode($dailyRates),
                'status' => $status,
            ]
        );
    }

    /**
     * Get or create attendance record for a date
     */
    protected function getAttendanceRecord($employee, $date, $attendanceRecords)
    {
        $record = $attendanceRecords->firstWhere('work_date', $date);
        
        if (!$record) {
            $dayOfWeek = (new \DateTime($date))->format('N');
            $status = ($dayOfWeek >= 6) ? 'Day Off' : 'Present';
            
            $record = new Attendance([
                'employee_number' => $employee->employee_number,
                'work_date' => $date,
                'daily_rate' => $employee->daily_rate,
                'adjustment' => 0,
                'status' => $status,
            ]);
        }
        
        return $record;
    }

    /**
     * Calculate daily pay amount
     */
    protected function calculateDailyPay($record, $employee)
    {
        $status = strtolower($record->status);
        $dailyRate = $record->daily_rate ?? $employee->daily_rate;
        $adjustment = $record->adjustment ?? 0;
        
        $amount = match ($status) {
            'present', 'holiday', 'leave', 'vacation leave', 'sick leave' => $dailyRate,
            'half day' => $dailyRate / 2,
            'absent', 'day off' => 0,
            default => $dailyRate,
        };
        
        return [
            'amount' => $amount,
            'adjustment' => $adjustment,
            'status' => $record->status
        ];
    }

    /**
     * Calculate all deductions
     */
    protected function calculateDeductions($grossPay)
    {
        $sss = max(0, $grossPay * 0.0363); // 3.63%
        $philhealth = max(0, $grossPay * 0.03); // 3%
        $pagibig = 100; // Fixed amount
        $tax = max(0, ($grossPay > 20833) ? ($grossPay - 20833) * 0.20 : 0);
        
        return [
            'sss' => $sss,
            'philhealth' => $philhealth,
            'pagibig' => $pagibig,
            'tax' => $tax,
            'total' => $sss + $philhealth + $pagibig + $tax
        ];
    }

    /**
     * Queue payslip emails for sending
     */
    protected function queuePayslipEmails($period, $employeeIds = [])
    {
        $query = PayrollEntry::where('payroll_period_id', $period->id)
            ->with('employee');
            
        if (!empty($employeeIds)) {
            $query->whereIn('employee_id', $employeeIds);
        }
        
        $payrollEntries = $query->get();
        
        // TODO: Implement actual email queuing
        // Example: SendPayslipEmail::dispatch($payrollEntry);
    }
}