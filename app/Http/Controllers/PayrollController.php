<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\PayrollEntry;
use App\Models\PayrollPeriod;
use App\Models\Department;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Throwable;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class PayrollController extends Controller {
  // Basic CRUD Operations
  public function index(Request $request)
  {
    try {
        // Start with a base query
        $query = PayrollEntry::with(['employee', 'payrollPeriod'])->orderBy('id', 'desc');
        
        // Apply search filter if provided
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->whereHas('employee', function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_number', 'like', "%{$search}%");
            });
        }
        
        // Apply status filter if provided
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }
        
        // Apply period filter if provided - using week_id instead of period_start
        if ($request->has('period') && !empty($request->period)) {
            $query->where('week_id', $request->period);
        }

        // Apply department filter if provided
        if ($request->has('department') && !empty($request->department)) {
            $query->whereHas('employee', function($q) use ($request) {
                $q->where('department', $request->department);
            });
        }
    
        // Get all entries for summary calculations - this query is not affected by pagination
        $allEntries = PayrollEntry::with(['employee'])->get();
    
        // Calculate summary statistics from all entries
        $totalGrossPay = $allEntries->sum('gross_pay');
        $totalNetPay = $allEntries->sum('net_pay');
        $totalDeductions = $allEntries->sum('total_deductions');
        $completedCount = $allEntries->filter(function($entry) {
            return in_array(strtolower($entry->status), ['paid', 'approved']);
        })->count();
        $pendingCount = $allEntries->filter(function($entry) {
            return in_array(strtolower($entry->status), ['pending', 'generated']);
        })->count();
    
        // Paginate the results
        $perPage = $request->input('per_page', 10); // Default 10 items per page
        $page = $request->input('page', 1);
        $paginatedEntries = $query->paginate($perPage);
    
        // Transform the paginated data
        $transformedEntries = $paginatedEntries->getCollection()->map(function($payroll) {
            // Get department information safely - department is a field, not a relationship
            $departmentName = '';
            
            if ($payroll->employee) {
                $departmentName = $payroll->employee->department ?? '';
            }
            
            return [
                'id' => $payroll->id,
                'employee_number' => $payroll->employee_number,
                'full_name' => $payroll->employee ? $payroll->employee->full_name : '',
                'department_name' => $departmentName,
                'position' => $payroll->employee ? $payroll->employee->position : null,
                'week_id' => $payroll->week_id,
                'daily_rate' => $payroll->daily_rate,
                'basic_salary' => $payroll->basic_salary ?? 0,
                'gross_pay' => (string)$payroll->gross_pay,
                'sss_deduction' => (string)$payroll->sss_deduction,
                'philhealth_deduction' => (string)$payroll->philhealth_deduction,
                'pagibig_deduction' => (string)$payroll->pagibig_deduction,
                'tax_deduction' => (string)$payroll->tax_deduction,
                'cash_advance' => (string)$payroll->cash_advance,
                'loan' => (string)$payroll->loan,
                'vat' => (string)$payroll->vat,
                'other_deductions' => (string)$payroll->other_deductions,
                'short' => (string)$payroll->short,
                'total_deductions' => (string)$payroll->total_deductions,
                'net_pay' => (string)$payroll->net_pay,
                'ytd_earnings' => (string)$payroll->ytd_earnings,
                'thirteenth_month_pay' => (string)$payroll->thirteenth_month_pay,
                'status' => $payroll->status,
                'created_at' => $payroll->created_at,
                'updated_at' => $payroll->updated_at,
            ];
        });
    
        // Create a new paginator with the transformed data
        $paginatedResult = new \Illuminate\Pagination\LengthAwarePaginator(
            $transformedEntries,
            $paginatedEntries->total(),
            $paginatedEntries->perPage(),
            $paginatedEntries->currentPage(),
            ['path' => \Request::url(), 'query' => $request->query()]
        );
    
        // Add summary statistics
        $summary = [
            'totalGrossPay' => $totalGrossPay,
            'totalNetPay' => $totalNetPay,
            'totalDeductions' => $totalDeductions,
            'completedCount' => $completedCount,
            'pendingCount' => $pendingCount,
            'totalCount' => $allEntries->count()
        ];

        // Get unique departments from employees
        $departments = Employee::select('department')
    ->distinct()
    ->whereNotNull('department')
    ->where('department', '!=', '')
    ->pluck('department')
    ->toArray();
        
        // Always return a successful response, even with empty results
        return Inertia::render('Payroll/Index', [
            'payrollEntries' => $paginatedResult,
            'payrollSummary' => $summary,
            'employees' => Employee::all(),
            'departments' => $departments,
            'payrollPeriods' => PayrollPeriod::all(),
            'filters' => $request->only(['search', 'status', 'period', 'department']),
        ]);
    } catch (\Exception $e) {
        Log::error('Payroll Index Error: ' . $e->getMessage());
        return Inertia::render('Payroll/Index', [
            'error' => 'Failed to retrieve payrolls.',
            'payrollEntries' => [],
            'payrollSummary' => [
                'totalGrossPay' => 0,
                'totalNetPay' => 0,
                'totalDeductions' => 0,
                'completedCount' => 0,
                'pendingCount' => 0,
                'totalCount' => 0
            ],
            'employees' => [],
            'departments' => [],
            'payrollPeriods' => [],
        ]);
    }
  }

  // FIXED: Enhanced store method with better error handling and debugging
  public function store(Request $request)
  {
      try {
          DB::beginTransaction();
          
          // Log the raw request data
          Log::info('Raw payroll creation request data:', $request->all());
          
          // Validate the request data
          $validated = $request->validate([
              'employee_number' => 'required|exists:employees,employee_number',
              'week_id' => 'required|exists:payroll_periods,week_id',
              'daily_rate' => 'nullable|numeric',
              'gross_pay' => 'required|numeric',
              'sss_deduction' => 'required|numeric',
              'philhealth_deduction' => 'required|numeric',
              'pagibig_deduction' => 'required|numeric',
              'tax_deduction' => 'required|numeric',
              'cash_advance' => 'numeric|nullable',
              'loan' => 'numeric|nullable',
              'vat' => 'numeric|nullable',
              'other_deductions' => 'numeric|nullable',
              'short' => 'numeric|nullable',
              'ytd_earnings' => 'numeric|nullable',
              'thirteenth_month_pay' => 'numeric|nullable',
              'status' => 'required|string',
          ]);

          // Set default values for nullable fields
          $validated['cash_advance'] = $validated['cash_advance'] ?? 0;
          $validated['loan'] = $validated['loan'] ?? 0;
          $validated['vat'] = $validated['vat'] ?? 0;
          $validated['other_deductions'] = $validated['other_deductions'] ?? 0;
          $validated['short'] = $validated['short'] ?? 0;
          $validated['ytd_earnings'] = $validated['ytd_earnings'] ?? 0;
          $validated['thirteenth_month_pay'] = $validated['thirteenth_month_pay'] ?? 0;

          // Calculate derived fields
          $validated['total_deductions'] = $validated['sss_deduction'] + 
                                         $validated['philhealth_deduction'] + 
                                         $validated['pagibig_deduction'] + 
                                         $validated['tax_deduction'] + 
                                         $validated['cash_advance'] + 
                                         $validated['loan'] + 
                                         $validated['vat'] + 
                                         $validated['other_deductions'] + 
                                         $validated['short'];
          
          $validated['net_pay'] = $validated['gross_pay'] - $validated['total_deductions'];

          // Log the data before creation
          Log::info('Creating payroll entry with validated data:', [
              'validated_data' => $validated
          ]);

          Log::info('About to create PayrollEntry with data:', [
              'employee_number' => $validated['employee_number'],
              'week_id' => $validated['week_id'],
              'gross_pay' => $validated['gross_pay'],
              'net_pay' => $validated['net_pay'],
              'total_deductions' => $validated['total_deductions'],
              'status' => $validated['status']
          ]);

          // Create a new PayrollEntry instance and set its properties
          $payroll = new PayrollEntry();
          
          // Only set non-generated columns
          $payroll->employee_number = $validated['employee_number'];
          $payroll->week_id = $validated['week_id'];
          $payroll->daily_rate = $validated['daily_rate'] ?? null;
          $payroll->gross_pay = $validated['gross_pay'];
          $payroll->sss_deduction = $validated['sss_deduction'];
          $payroll->philhealth_deduction = $validated['philhealth_deduction'];
          $payroll->pagibig_deduction = $validated['pagibig_deduction'];
          $payroll->tax_deduction = $validated['tax_deduction'];
          $payroll->cash_advance = $validated['cash_advance'];
          $payroll->loan = $validated['loan'];
          $payroll->vat = $validated['vat'];
          $payroll->other_deductions = $validated['other_deductions'];
          $payroll->short = $validated['short'];
          $payroll->ytd_earnings = $validated['ytd_earnings'];
          $payroll->thirteenth_month_pay = $validated['thirteenth_month_pay'];
          $payroll->status = $validated['status'];
          
          // Save the model
          $saved = $payroll->save();
          
          if (!$saved) {
              throw new \Exception('Failed to save payroll entry');
          }

          // Log the result
          Log::info('Create result:', [
              'payroll_id' => $payroll->id,
              'payroll' => $payroll->toArray(),
              'saved' => $saved
          ]);
          
          DB::commit();

          if ($request->wantsJson()) {
              return response()->json([
                  'success' => true,
                  'message' => 'Payroll created successfully!',
                  'payroll' => $payroll
              ]);
          }

          return redirect()->back()->with('success', 'Payroll created successfully!');
      } catch (\Exception $e) {
          DB::rollBack();
          Log::error('Error storing payroll: ' . $e->getMessage());
          Log::error('Stack trace: ' . $e->getTraceAsString());
          
          if ($request->wantsJson()) {
              return response()->json([
                  'success' => false,
                  'message' => 'Failed to store payroll: ' . $e->getMessage()
              ], 500);
          }
          
          return redirect()->back()->with('error', 'Failed to store payroll: ' . $e->getMessage());
      }
  }

  // FIXED: Enhanced update method with better error handling and debugging
  // ENHANCED: This update method ensures all PrintPayslip changes are properly persisted
  public function update(Request $request, $id)
  {
      try {
          DB::beginTransaction();
          
          // Enhanced logging for debugging
          Log::info('Raw payroll update request data for ID ' . $id . ':', $request->all());
          
          // Find the payroll entry first to ensure it exists - using correct relationship name
          $payroll = PayrollEntry::with('payrollPeriod')->findOrFail($id);
          
          // Log the original payroll data before any changes
          Log::info('Original payroll data before update:', $payroll->toArray());
          
          // Validate the request data
          $validated = $request->validate([
              'employee_number' => 'required|exists:employees,employee_number',
              'week_id' => 'sometimes|nullable|exists:payroll_periods,week_id',
              'daily_rate' => 'nullable|numeric|min:0',
              'gross_pay' => 'required|numeric|min:0',
              'sss_deduction' => 'required|numeric|min:0',
              'philhealth_deduction' => 'required|numeric|min:0',
              'pagibig_deduction' => 'required|numeric|min:0',
              'tax_deduction' => 'required|numeric|min:0',
              'cash_advance' => 'nullable|numeric|min:0',
              'loan' => 'nullable|numeric|min:0',
              'vat' => 'nullable|numeric|min:0',
              'other_deductions' => 'nullable|numeric|min:0',
              'short' => 'nullable|numeric|min:0',
              'ytd_earnings' => 'nullable|numeric|min:0',
              'thirteenth_month_pay' => 'nullable|numeric|min:0',
              'status' => 'sometimes|required|string|in:generated,approved,paid,pending,rejected,Generated,Approved,Paid,Pending,Rejected',
              'period_start' => 'sometimes|nullable|date',
              'period_end' => 'sometimes|nullable|date',
          ]);
  
          // Handle payroll period dates if provided
          if ($request->has('period_start') && $request->period_start) {
              $payrollPeriod = $payroll->payrollPeriod;
              if ($payrollPeriod) {
                  Log::info('Updating period_start from ' . $payrollPeriod->period_start . ' to ' . $request->period_start);
                  $payrollPeriod->period_start = $request->period_start;
                  $payrollPeriod->save();
              } else {
                  Log::warning('Cannot update period_start: payroll period not found for week_id ' . $payroll->week_id);
              }
          }
          
          if ($request->has('period_end') && $request->period_end) {
              $payrollPeriod = $payroll->payrollPeriod;
              if ($payrollPeriod) {
                  Log::info('Updating period_end from ' . $payrollPeriod->period_end . ' to ' . $request->period_end);
                  $payrollPeriod->period_end = $request->period_end;
                  $payrollPeriod->save();
              } else {
                  Log::warning('Cannot update period_end: payroll period not found for week_id ' . $payroll->week_id);
              }
          }
  
          // Set default values for nullable fields
          $defaults = [
              'cash_advance' => 0,
              'loan' => 0,
              'vat' => 0,
              'other_deductions' => 0,
              'short' => 0,
              'ytd_earnings' => 0,
              'thirteenth_month_pay' => 0,
              'daily_rate' => $payroll->daily_rate, // Preserve existing if not provided
              'week_id' => $payroll->week_id, // Preserve existing if not provided
          ];
  
          foreach ($defaults as $field => $value) {
              $validated[$field] = $validated[$field] ?? $value;
          }
  
          // Get the employee
          $employee = Employee::where('employee_number', $validated['employee_number'])->first();
          
          if ($employee) {
              Log::info('Found employee:', $employee->toArray());
          } else {
              Log::warning('Employee not found for employee_number: ' . $validated['employee_number']);
              throw new \Exception('Employee not found');
          }
  
          // Only apply short if employee is Allen One
          if ($employee->department !== 'Allen One') {
              $validated['short'] = 0; // Force to 0 for non-Allen One employees
          }
  
          // Calculate total deductions correctly
          $totalDeductions = $validated['sss_deduction'] +
                            $validated['philhealth_deduction'] +
                            $validated['pagibig_deduction'] +
                            $validated['tax_deduction'] +
                            $validated['cash_advance'] +
                            $validated['loan'] +
                            $validated['vat'] +
                            $validated['other_deductions'] +
                            $validated['short'];
  
          // Set the total_deductions field
          $validated['total_deductions'] = $totalDeductions;
          
          // Log the data before update
          Log::info('Before update', [
              'id' => $id,
              'validated_data' => $validated,
              'original_data' => $payroll->toArray()
          ]);
  
          // Update payroll fields
          $payroll->fill([
            'employee_number' => $validated['employee_number'],
            'week_id' => $validated['week_id'],
            'daily_rate' => $validated['daily_rate'],
            'gross_pay' => $validated['gross_pay'],
            'sss_deduction' => $validated['sss_deduction'],
            'philhealth_deduction' => $validated['philhealth_deduction'],
            'pagibig_deduction' => $validated['pagibig_deduction'],
            'tax_deduction' => $validated['tax_deduction'],
            'cash_advance' => $validated['cash_advance'],
            'loan' => $validated['loan'],
            'vat' => $validated['vat'],
            'other_deductions' => $validated['other_deductions'],
            'short' => $validated['short'],
            'ytd_earnings' => $validated['ytd_earnings'],
            'thirteenth_month_pay' => $validated['thirteenth_month_pay'],
            'status' => $validated['status'] ?? $payroll->status,
        ]);
          
          // Update employee details if provided
          $employeeUpdates = [];
          if ($request->has('full_name')) {
              $employeeUpdates['full_name'] = $request->full_name;
          }
          if ($request->has('department')) {
              $employeeUpdates['department'] = $request->department;
          }
          if ($request->has('position')) {
              $employeeUpdates['position'] = $request->position;
          }
          
          if (!empty($employeeUpdates)) {
              Log::info('Updating employee details:', $employeeUpdates);
              $employee->update($employeeUpdates);
          }
          
          // Update gross pay based on attendance if needed
          if ($request->input('update_gross_pay', false)) {
              $grossPayResult = $this->updateGrossPayFromAttendance($id);
              if ($grossPayResult['success']) {
                  $payroll->gross_pay = $grossPayResult['payroll']->gross_pay;
              }
          }
          
          // Save the changes
          $saved = $payroll->save();
          
          if (!$saved) {
              throw new \Exception('Failed to save updated payroll entry');
          }
  
          // Log the result
          Log::info('Update result', [
              'saved' => $saved,
              'after' => $payroll->fresh()->toArray()
          ]);
          
          DB::commit();
  
          return $request->wantsJson()
              ? response()->json([
                  'success' => true,
                  'message' => 'Payroll updated successfully!',
                  'payroll' => $payroll->fresh()
                ])
              : redirect()->back()->with('success', 'Payroll updated successfully!');
      } catch (\Exception $e) {
          DB::rollBack();
          Log::error('Error updating payroll: ' . $e->getMessage());
          Log::error('Stack trace: ' . $e->getTraceAsString());
          
          return $request->wantsJson()
              ? response()->json([
                  'success' => false,
                  'message' => 'Failed to update payroll: ' . $e->getMessage()
                ], 500)
              : back()->with('error', 'Failed to update payroll: ' . $e->getMessage());
      }
  }

  // FIXED: Enhanced generatePayroll method with better error handling and debugging
  public function generatePayroll(Request $request)
  {
    try {
        // Validate the request
        $request->validate([
            'week_id' => 'required|exists:payroll_periods,week_id',
        ]);

        $weekId = $request->input('week_id');
        Log::info('Generating payroll for week_id: ' . $weekId);
        
        // Find the payroll period
        $payrollPeriod = PayrollPeriod::where('week_id', $weekId)->firstOrFail();
        Log::info('Found payroll period:', $payrollPeriod->toArray());
        
        $startDate = $payrollPeriod->period_start;
        $endDate = $payrollPeriod->period_end;

        // Get all employees
        $employees = Employee::all();
        Log::info('Found ' . $employees->count() . ' employees for payroll generation');

        // Debug: Check if we have any employees
        if ($employees->count() == 0) {
            Log::error('No employees found in the database');
            throw new \Exception('No employees found in the database');
        }

        // Get existing payroll entries for this period
        $existingEntries = PayrollEntry::where('week_id', $weekId)->get();
        $existingEmployeeNumbers = $existingEntries->pluck('employee_number')->toArray();
        
        Log::info('Found ' . $existingEntries->count() . ' existing payroll entries for week_id: ' . $weekId);
        Log::info('Existing employee numbers:', $existingEmployeeNumbers);

        DB::beginTransaction();
        
        $createdCount = 0;
        $skippedCount = 0;
        $payrollEntries = [];
        
        foreach ($employees as $employee) {
            Log::info('Processing employee: ' . $employee->employee_number . ' - ' . $employee->full_name);
            
            // Skip employees who already have a payroll entry for this period
            if (in_array($employee->employee_number, $existingEmployeeNumbers)) {
                Log::info('Skipping employee ' . $employee->employee_number . ' as they already have a payroll entry for this period');
                $skippedCount++;
                continue;
            }
            
            // Get attendance records for this employee in the period
            $attendanceRecords = Attendance::where('employee_number', $employee->employee_number)
                ->whereBetween('work_date', [$startDate, $endDate])
                ->get();
                
            Log::info('Found ' . $attendanceRecords->count() . ' attendance records for employee ' . $employee->employee_number);
            
            // Calculate gross pay based on attendance
            $grossPay = 0;
            $dailyRates = [];
            
            if ($attendanceRecords->count() > 0) {
                foreach ($attendanceRecords as $record) {
                    $status = $record->status;
                    $dailyRate = $record->daily_rate ?? $employee->daily_rate ?? 0;
                    $adjustment = $record->adjustment ?? 0;
                    
                    // Calculate pay based on status
                    $amount = 0;
                    switch (strtolower($status)) {
                        case 'present':
                            $amount = $dailyRate * 1;
                            break;
                        case 'half day':
                            $amount = $dailyRate / 2;
                            break;
                        case 'absent':
                        case 'day off':
                        case 'leave':
                            $amount = 0;
                            break;
                        case 'holiday':
                            // Check if it's a regular or special holiday
                            $holidayType = $record->holiday_type ?? '';
                            if (str_contains(strtolower($holidayType), 'regular')) {
                                $amount = $dailyRate * 1.3; // Regular holiday
                            } else {
                                $amount = $dailyRate * 2; // Special holiday
                            }
                            break;
                        case 'wfh':
                        case 'sp':
                            $amount = $dailyRate * 1;
                            break;
                        default:
                            $amount = $dailyRate;
                            break;
                    }
                    
                    $grossPay += $amount + $adjustment;
                    
                    // Store daily rate info for reference
                    $dailyRates[] = [
                        'date' => $record->work_date,
                        'amount' => $dailyRate,
                        'status' => $status,
                        'adjustment' => $adjustment
                    ];
                }
            } else {
                // If no attendance records, use default calculation (5 working days)
                $dailyRate = $employee->daily_rate ?? 0;
                $grossPay = $dailyRate * 5;
                
                Log::info('No attendance records found, using default calculation. Daily rate: ' . $dailyRate . ', Gross pay: ' . $grossPay);
                
                // Create default daily rates for the period
                $currentDate = new \DateTime($startDate);
                $endDateTime = new \DateTime($endDate);
                
                while ($currentDate <= $endDateTime) {
                    $dateStr = $currentDate->format('Y-m-d');
                    $isWeekend = in_array($currentDate->format('N'), [6, 7]); // 6=Saturday, 7=Sunday
                    
                    $dailyRates[] = [
                        'date' => $dateStr,
                        'amount' => $dailyRate,
                        'status' => $isWeekend ? 'Day Off' : 'Present',
                        'adjustment' => 0
                    ];
                    
                    $currentDate->modify('+1 day');
                }
            }
            
            // Calculate deductions
            $sssDeduction = $this->calculateSSS($grossPay);
            $philhealthDeduction = $this->calculatePhilhealth($grossPay);
            $pagibigDeduction = $this->calculatePagibig($grossPay);
            $taxDeduction = $this->calculateTax($grossPay);
            
            $totalDeductions = $sssDeduction + $philhealthDeduction + $pagibigDeduction + $taxDeduction;
            $netPay = max(0, $grossPay - $totalDeductions);

            Log::info('Calculated payroll for employee ' . $employee->employee_number, [
                'gross_pay' => $grossPay,
                'total_deductions' => $totalDeductions,
                'net_pay' => $netPay
            ]);

            // Create payroll entry data
            $payrollEntries[] = [
                'employee_number' => $employee->employee_number,
                'week_id' => $weekId,
                'gross_pay' => $grossPay,
                'sss_deduction' => $sssDeduction,
                'philhealth_deduction' => $philhealthDeduction,
                'pagibig_deduction' => $pagibigDeduction,
                'tax_deduction' => $taxDeduction,
                'cash_advance' => 0,
                'loan' => 0,
                'vat' => 0,
                'other_deductions' => 0,
                'short' => 0,
                // 'total_deductions' and 'net_pay' are GENERATED columns, so we don't include them
                'daily_rate' => $employee->daily_rate ?? 0,
                'status' => 'Pending',
                'ytd_earnings' => 0,
                'thirteenth_month_pay' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            
            $createdCount++;
        }
        
        // Batch insert all payroll entries
        if (!empty($payrollEntries)) {
            Log::info('Attempting to insert ' . count($payrollEntries) . ' payroll entries');
            
            try {
                PayrollEntry::insert($payrollEntries);
                Log::info('Successfully inserted ' . count($payrollEntries) . ' payroll entries');
            } catch (\Exception $e) {
                Log::error('Error inserting payroll entries: ' . $e->getMessage());
                Log::error('First entry data: ' . json_encode($payrollEntries[0] ?? []));
                throw $e;
            }
        } else {
            Log::warning('No new payroll entries to insert');
        }

        DB::commit();
        Log::info('Payroll generation completed. Created: ' . $createdCount . ', Skipped: ' . $skippedCount);
        
        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Payroll generated successfully for the period. Created: ' . $createdCount . ', Skipped: ' . $skippedCount
            ]);
        }
        
        return redirect()->back()->with('success', 'Payroll generated successfully for the period. Created: ' . $createdCount . ', Skipped: ' . $skippedCount);
    } catch (Throwable $e) {
        DB::rollback();
        Log::error('Payroll generation failed: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        if ($request->wantsJson()) {
            return response()->json([
                'success' => false,
                'message' => 'Payroll generation failed: ' . $e->getMessage()
            ], 500);
        }
        
        return redirect()->back()->with('error', 'Payroll generation failed: ' . $e->getMessage());
    }
  }

  public function listPeriods(Request $request)
  {
      try {
          $query = PayrollPeriod::orderBy('period_start', 'desc');
          
          // Apply search filter if provided
          if ($request->has('search') && !empty($request->search)) {
              $search = $request->search;
              $query->where(function($q) use ($search) {
                  $q->where('week_id', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
              });
          }
          
          // Apply status filter if provided
          if ($request->has('status') && !empty($request->status)) {
              $query->where('status', $request->status);
          }
          
          $perPage = $request->input('per_page', 10); // Default 10 items per page
          $periods = $query->paginate($perPage);
          
          return response()->json([
              'success' => true,
              'periods' => $periods
          ]);
      } catch (\Exception $e) {
          Log::error('Error listing payroll periods: ' . $e->getMessage());
          return response()->json([
              'success' => false,
              'message' => 'Failed to fetch payroll periods'
          ], 500);
      }
  }

  public function show($id) {
      $payroll = PayrollEntry::with(['employee', 'payrollPeriod'])->findOrFail($id);

      $attendance = DB::table('attendance')
              ->select(
                  'id',
                  'employee_number',
                  'work_date',
                  'daily_rate',
                  'adjustment',
                  'status'
              )
              ->where('employee_number', $payroll->employee_number)
              ->get();

      return Inertia::render('Payroll/Show', [
              'payroll' => $payroll,
              'attendance' => $attendance
          ]);
  }

  public function destroy($id) {
      try {
          $payroll = PayrollEntry::findOrFail($id);
          $payroll->delete();

          return redirect()->back()->with('success', 'Payroll deleted successfully!');
      } catch (\Exception $e) {
          Log::error('Error deleting payroll: ' . $e->getMessage());
          return redirect()->back()->with('error', 'Failed to delete payroll.');
      }
  }

  public function generateFromAttendance(Request $request)
  {
    try {
        Log::info('Generating payroll from attendance with request data:', $request->all());
        
        $validated = $request->validate([
            'payroll_period_id' => 'required|exists:payroll_periods,id',
            'week_id' => 'required|exists:payroll_periods,week_id',
            'include_daily_rates' => 'boolean',
            'respect_attendance_status' => 'boolean',
            'overwrite_existing' => 'boolean',
        ]);

        Log::info('Validated data:', $validated);
        
        $payrollPeriod = PayrollPeriod::where('week_id', $validated['week_id'])->firstOrFail();
        
        $overwriteExisting = $validated['overwrite_existing'] ?? false;

        if (!$overwriteExisting && PayrollEntry::where('week_id', $validated['week_id'])->exists()) {
            Log::warning('Payroll records already exist for this period and overwrite_existing is false');
            return response()->json([
                'message' => 'Payroll records already exist for this period. Set overwrite_existing to true to replace them.',
            ], 422);
        }

        if ($overwriteExisting) {
            $deletedCount = PayrollEntry::where('week_id', $validated['week_id'])->delete();
            Log::info("Deleted {$deletedCount} existing payroll entries for week_id: {$validated['week_id']}");
        }

        $employees = Employee::all();
        Log::info("Found {$employees->count()} employees");
        
        $attendanceRecords = DB::table('attendance')
            ->whereBetween('work_date', [$payrollPeriod->period_start, $payrollPeriod->period_end])
            ->get();
        Log::info("Found {$attendanceRecords->count()} attendance records in the period");

        $attendanceByEmployee = [];
        foreach ($attendanceRecords as $record) {
            $attendanceByEmployee[$record->employee_number][] = $record;
        }

        $payrollRecords = [];
        foreach ($employees as $employee) {
            $employeeAttendance = $attendanceByEmployee[$employee->employee_number] ?? [];
            $grossPay = 0;
            $dailyRates = [];

            if (count($employeeAttendance) > 0 && ($validated['respect_attendance_status'] ?? true)) {
                foreach ($employeeAttendance as $record) {
                    $status = $record->status;
                    $dailyRate = $record->daily_rate ?? $employee->daily_rate;
                    $adjustment = $record->adjustment ?? 0;

                    $amount = match (strtolower($status)) {
                        'present' => $dailyRate * 1, // Present * 1
                        'absent' => $dailyRate * 0, // Absent * 0
                        'day off' => $dailyRate * 0, // Day Off * 0
                        'half day' => $dailyRate / 2, // Half Day / 2
                        'holiday' => str_contains(strtolower($record->holiday_type ?? ''), 'regular') ? $dailyRate * 1.3 : $dailyRate * 2, // Holiday logic
                        'leave' => $dailyRate * 0, // Leave * 0
                        'wfh' => $dailyRate * 1, // WFH * 1
                        'sp' => $dailyRate * 1, // SP * 1
                        default => $dailyRate,
                    };

                    $grossPay += $amount + $adjustment;

                    if ($validated['include_daily_rates'] ?? false) {
                        $dailyRates[] = [
                            'date' => $record->work_date,
                            'amount' => $dailyRate,
                            'status' => $status,
                            'adjustment' => $adjustment
                        ];
                    }
                }
            } else {
                $startDate = new \DateTime($payrollPeriod->period_start);
                $endDate = new \DateTime($payrollPeriod->period_end);
                $days = $startDate->diff($endDate)->days + 1;
                $grossPay = $employee->daily_rate * $days;
            }

            $sssDeduction = $this->calculateSSS($grossPay);
            $philhealthDeduction = $this->calculatePhilhealth($grossPay);
            $pagibigDeduction = $this->calculatePagibig($grossPay);
            $taxDeduction = $this->calculateTax($grossPay);

            $totalDeductions = $sssDeduction + $philhealthDeduction + $pagibigDeduction + $taxDeduction;
            $netPay = max(0, $grossPay - $totalDeductions);

            $payrollRecord = [
                'employee_number' => $employee->employee_number,
                'week_id' => $payrollPeriod->week_id,
                'gross_pay' => $grossPay,
                'sss_deduction' => $sssDeduction,
                'philhealth_deduction' => $philhealthDeduction,
                'pagibig_deduction' => $pagibigDeduction,
                'tax_deduction' => $taxDeduction,
                'cash_advance' => 0,
                'loan' => 0,
                'vat' => 0,
                'other_deductions' => 0,
                'short' => 0,
                // 'total_deductions' and 'net_pay' are GENERATED columns, so we don't include them
                'daily_rate' => $employee->daily_rate,
                'status' => 'generated',
                'ytd_earnings' => 0,
                'thirteenth_month_pay' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // Only add daily_rates if include_daily_rates is true and the column exists
            if (($validated['include_daily_rates'] ?? false) && Schema::hasColumn('payroll_entries', 'daily_rates')) {
                $payrollRecord['daily_rates'] = json_encode($dailyRates);
            }

            $payrollRecords[] = $payrollRecord;
        }

        Log::info("Prepared " . count($payrollRecords) . " payroll records for insertion");

        if (!empty($payrollRecords)) {
            try {
                DB::beginTransaction();
                PayrollEntry::insert($payrollRecords);
                DB::commit();
                Log::info("Successfully inserted " . count($payrollRecords) . " payroll records");
                return redirect()->back()->with('success', 'Payroll generated successfully!');
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error("Failed to insert payroll records: " . $e->getMessage());
                return redirect()->back()->with('error', 'Failed to generate payroll: ' . $e->getMessage());
            }
        }

        return redirect()->back()->with('success', 'Payroll generated successfully!');
    } catch (\Exception $e) {
        Log::error('Payroll Generation Error: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        return redirect()->back()->with('error', 'Failed to generate payroll: ' . $e->getMessage());
    }
  }

  // Payroll Period Management
  public function createPeriod(Request $request)
  {
      DB::beginTransaction();
      
      try {
          // Check if overwrite_existing flag is set
          $overwriteExisting = $request->input('overwrite_existing', false);
          
          // Validate the request data
          $validated = $request->validate([
              'week_id' => [
                  'required',
                  'integer',
                  // Only apply unique rule if not overwriting
                  function ($attribute, $value, $fail) use ($overwriteExisting) {
                      if (!$overwriteExisting) {
                          $exists = PayrollPeriod::where('week_id', $value)->exists();
                          if ($exists) {
                              $fail('A payroll period with this week ID already exists.');
                          }
                      }
                  }
              ],
              'period_start' => 'required|date',
              'period_end' => 'required|date|after_or_equal:period_start',
              'payment_date' => 'required|date|after_or_equal:period_end',
              'status' => 'required|string',
          ]);

          // If overwriting, delete existing period with the same week_id
          if ($overwriteExisting) {
              $existingPeriod = PayrollPeriod::where('week_id', $validated['week_id'])->first();
              if ($existingPeriod) {
                  Log::info('Overwriting existing payroll period with week_id: ' . $validated['week_id']);
                  
                  // Check if there are any payroll entries associated with this period
                  $hasEntries = PayrollEntry::where('week_id', $validated['week_id'])->exists();
                  if ($hasEntries) {
                      Log::info('Deleting associated payroll entries for week_id: ' . $validated['week_id']);
                      PayrollEntry::where('week_id', $validated['week_id'])->delete();
                  }
                  
                  $existingPeriod->delete();
              }
          }

          // Create the payroll period with all required fields
          $payrollPeriod = PayrollPeriod::create([
              'week_id' => $validated['week_id'],
              'period_start' => $validated['period_start'],
              'period_end' => $validated['period_end'],
              'payment_date' => $validated['payment_date'],
              'status' => $validated['status'],
              'description' => $request->description ?? null,
          ]);

          DB::commit();

          if ($request->wantsJson()) {
              return response()->json([
                  'success' => true,
                  'period' => $payrollPeriod,
                  'message' => 'Payroll period created successfully'
              ]);
          }

          return redirect()->back()->with('success', 'Payroll period created successfully!');
      } catch (\Exception $e) {
          DB::rollBack();
          Log::error('Error creating payroll period: ' . $e->getMessage());
          
          if ($request->wantsJson()) {
              return response()->json([
                  'success' => false,
                  'message' => 'Failed to create payroll period: ' . $e->getMessage()
              ], 500);
          }

          return redirect()->back()->with('error', 'Failed to create payroll period: ' . $e->getMessage());
      }
  }

  public function updatePeriod(Request $request, $id)
  {
      DB::beginTransaction();

      try {
          // Get the current period
          $payrollPeriod = PayrollPeriod::findOrFail($id);
          
          // Check if overwrite_existing flag is set
          $overwriteExisting = $request->input('overwrite_existing', false);
          
          // Validate the request data
          $validated = $request->validate([
              'week_id' => [
                  'required',
                  'integer',
                  // Only apply unique rule if week_id is changing and not overwriting
                  function ($attribute, $value, $fail) use ($payrollPeriod, $overwriteExisting) {
                      if ($value != $payrollPeriod->week_id && !$overwriteExisting) {
                          $exists = PayrollPeriod::where('week_id', $value)
                              ->where('id', '!=', $payrollPeriod->id)
                              ->exists();
                          if ($exists) {
                              $fail('A payroll period with this week ID already exists.');
                          }
                      }
                  }
              ],
              'period_start' => 'required|date',
              'period_end' => 'required|date|after_or_equal:period_start',
              'payment_date' => 'required|date|after_or_equal:period_end',
              'status' => 'required|string',
          ]);

          // If week_id is changing and overwriting is enabled, handle the conflict
          if ($validated['week_id'] != $payrollPeriod->week_id && $overwriteExisting) {
              $existingPeriod = PayrollPeriod::where('week_id', $validated['week_id'])
                  ->where('id', '!=', $payrollPeriod->id)
                  ->first();
                  
              if ($existingPeriod) {
                  Log::info('Overwriting existing payroll period with week_id: ' . $validated['week_id']);
                  
                  // Check if there are any payroll entries associated with the conflicting period
                  $hasEntries = PayrollEntry::where('week_id', $validated['week_id'])->exists();
                  if ($hasEntries) {
                      Log::info('Deleting associated payroll entries for week_id: ' . $validated['week_id']);
                      PayrollEntry::where('week_id', $validated['week_id'])->delete();
                  }
                  
                  $existingPeriod->delete();
              }
              
              // Update payroll entries associated with the old week_id
              if (PayrollEntry::where('week_id', $payrollPeriod->week_id)->exists()) {
                  Log::info('Updating associated payroll entries from week_id ' . $payrollPeriod->week_id . ' to ' . $validated['week_id']);
                  PayrollEntry::where('week_id', $payrollPeriod->week_id)
                      ->update(['week_id' => $validated['week_id']]);
              }
          }
          
          // Log the data being updated for debugging
          Log::info('Updating payroll period', [
              'id' => $id,
              'data' => $validated,
              'original' => $payrollPeriod->toArray()
          ]);
      
          // Update with all required fields
          $updated = $payrollPeriod->update([
              'week_id' => $validated['week_id'],
              'period_start' => $validated['period_start'],
              'period_end' => $validated['period_end'],
              'payment_date' => $validated['payment_date'],
              'status' => $validated['status'],
              'description' => $request->description ?? $payrollPeriod->description,
          ]);
      
          // Log the result of the update operation
          Log::info('Update result', ['updated' => $updated, 'after' => $payrollPeriod->fresh()->toArray()]);

          DB::commit();

          if ($request->wantsJson()) {
              return response()->json([
                  'success' => true,
                  'period' => $payrollPeriod->fresh(),
                  'message' => 'Payroll period updated successfully'
              ]);
          }

          return redirect()->back()->with('success', 'Payroll period updated successfully!');
      } catch (\Exception $e) {
          DB::rollBack();
          Log::error('Error updating payroll period: ' . $e->getMessage());
          Log::error('Stack trace: ' . $e->getTraceAsString());
      
          if ($request->wantsJson()) {
              return response()->json([
                  'success' => false,
                  'message' => 'Failed to update payroll period: ' . $e->getMessage()
              ], 500);
          }

          return redirect()->back()->with('error', 'Failed to update payroll period: ' . $e->getMessage());
      }
  }
  
  public function destroyPeriod(Request $request, $id)
  {
      DB::beginTransaction();
  
      try {
          $payrollPeriod = PayrollPeriod::findOrFail($id);
      
          // Check if there are any payroll entries associated with this period
          $hasEntries = PayrollEntry::where('week_id', $payrollPeriod->week_id)->exists();
      
          if ($hasEntries) {
              // Optionally, delete associated entries or prevent deletion
              if ($request->input('force_delete', false)) {
                  PayrollEntry::where('week_id', $payrollPeriod->week_id)->delete();
                  Log::info("Deleted associated payroll entries for period {$id} with week_id {$payrollPeriod->week_id}");
              } else {
                  throw new \Exception('Cannot delete period with associated payroll entries. Set force_delete=true to override.');
              }
          }
      
          $deleted = $payrollPeriod->delete();
          Log::info("Deleted payroll period {$id}: " . ($deleted ? 'success' : 'failed'));
      
          DB::commit();
      
          if ($request->wantsJson()) {
              return response()->json([
                  'success' => true,
                  'message' => 'Payroll period deleted successfully'
              ]);
          }
      
          return redirect()->back()->with('success', 'Payroll period deleted successfully!');
      } catch (\Exception $e) {
          DB::rollBack();
          Log::error('Error deleting payroll period: ' . $e->getMessage());
      
          if ($request->wantsJson()) {
              return response()->json([
                  'success' => false,
                  'message' => 'Failed to delete payroll period: ' . $e->getMessage()
              ], 500);
          }
      
          return redirect()->back()->with('error', 'Failed to delete payroll period: ' . $e->getMessage());
      }
  }

  // Payslip and Attendance Methods
  public function printPayslip($id, Request $request) {
  try {
      // Check if we should overwrite existing payslip
      $overwrite = $request->has('overwrite') ? (bool)$request->input('overwrite') : false;
      
      // Find the payroll entry with related data
      $payroll = PayrollEntry::with(['employee', 'payrollPeriod'])->findOrFail($id);
      
      // Log the payroll data for debugging
      Log::info('Printing payslip for payroll ID: ' . $id, [
          'payroll_data' => $payroll->toArray(),
          'overwrite' => $overwrite
      ]);
      
      // Check if payroll period exists
      $payrollPeriod = $payroll->payrollPeriod;
      if (!$payrollPeriod) {
          Log::error('Payroll period not found for payroll ID: ' . $id);
          return redirect()->back()->with('error', 'Payroll period not found');
      }
      
      // Format dates
      $startDate = new \DateTime($payrollPeriod->period_start);
      $endDate = new \DateTime($payrollPeriod->period_end);
      $formattedStartDate = $startDate->format('Y-m-d');
      $formattedEndDate = $endDate->format('Y-m-d');

      // Check if a payslip file already exists
      $payslipPath = storage_path("app/payslips/payslip-{$payroll->employee_number}-{$payrollPeriod->week_id}.pdf");
      $payslipExists = file_exists($payslipPath);
      
      if ($payslipExists && !$overwrite) {
          Log::info('Payslip already exists and overwrite is false, returning existing payslip');
          // Return existing payslip if it exists and overwrite is false
          return response()->file($payslipPath);
      }

      // Get attendance records
      $attendanceRecords = Attendance::where('employee_number', $payroll->employee_number)
          ->whereBetween('work_date', [$formattedStartDate, $formattedEndDate])
          ->orderBy('work_date')
          ->get();
      
      Log::info('Found ' . $attendanceRecords->count() . ' attendance records for payslip');
      
      // If no attendance records found, try to use the daily_rates from the payroll entry
      if ($attendanceRecords->isEmpty() && $payroll->daily_rates) {
          Log::info('No attendance records found, using daily_rates from payroll entry');
          
          // Parse daily_rates JSON
          $dailyRates = null;
          try {
              if (is_string($payroll->daily_rates)) {
                  $dailyRates = json_decode($payroll->daily_rates, true);
              } else {
                  $dailyRates = $payroll->daily_rates;
              }
          } catch (\Exception $e) {
              Log::error('Error parsing daily_rates JSON: ' . $e->getMessage());
          }
          
          // Create attendance records from daily_rates
          if (is_array($dailyRates)) {
              Log::info('Creating attendance records from daily_rates', [
                  'daily_rates_count' => count($dailyRates)
              ]);
              
              foreach ($dailyRates as $rate) {
                  $date = $rate['date'] ?? $rate['work_date'] ?? null;
                  if ($date) {
                      // Create a new Attendance object
                      $attendance = new Attendance([
                          'id' => rand(1000, 9999),
                          'employee_number' => $payroll->employee_number,
                          'work_date' => $date,
                          'daily_rate' => $rate['amount'] ?? $rate['daily_rate'] ?? $payroll->daily_rate ?? 0,
                          'adjustment' => $rate['adjustment'] ?? 0,
                          'status' => $rate['status'] ?? 'Present',
                      ]);
                      
                      $attendanceRecords[] = $attendance;
                  }
              }
          }
      }
      
      // If still no attendance records, generate default ones
      if ($attendanceRecords->isEmpty()) {
          Log::info('No attendance records or daily_rates found, generating default records');
          
          // Get the employee
          $employee = $payroll->employee;
          if ($employee) {
              $attendanceRecords = $this->generateDefaultAttendanceRecords(
                  $employee,
                  $formattedStartDate,
                  $formattedEndDate
              );
          }
      }
      
      // Log the final attendance records
      Log::info('Final attendance records for payslip: ' . $attendanceRecords->count());

      // Return the data to the view
      return Inertia::render('Payroll/PrintPayslip', [
          'payroll' => $payroll,
          'attendances' => $attendanceRecords,
          'period' => [
              'id' => $payrollPeriod->id,
              'period_start' => $formattedStartDate,
              'period_end' => $formattedEndDate,
              'week_id' => $payrollPeriod->week_id ?? null,
          ],
          'overwrite' => $overwrite,
      ]);
  } catch (\Exception $e) {
      Log::error('Error preparing payslip data: ' . $e->getMessage());
      Log::error('Stack trace: ' . $e->getTraceAsString());
      return back()->with('error', 'Failed to prepare payslip data: ' . $e->getMessage());
  }
}

  public function fetchAttendanceForPayslip(Request $request)
  {
      try {
          $validated = $request->validate([
              'employee_number' => 'required',
              'week_id' => 'required|exists:payroll_periods,id',
              'start_date' => 'nullable|date',
              'end_date' => 'nullable|date',
          ]);

          $payrollPeriod = PayrollPeriod::findOrFail($validated['week_id']);
          $startDate = $validated['start_date'] ?? $payrollPeriod->period_start;
          $endDate = $validated['end_date'] ?? $payrollPeriod->period_end;
          
          $startDateTime = new \DateTime($startDate);
          $endDateTime = new \DateTime($endDate);
          
          $attendanceRecords = Attendance::where('employee_number', $validated['employee_number'])
              ->whereBetween('work_date', [$startDate, $endDate])
              ->orderBy('work_date')
              ->get();
              
          if ($attendanceRecords->isEmpty()) {
              $employee = Employee::where('employee_number', $validated['employee_number'])->first();
              
              if ($employee) {
                  $attendanceRecords = $this->generateDefaultAttendanceRecords(
                      $employee,
                      $startDate,
                      $endDate
                  );
              }
          }

          return response()->json([
              'success' => true,
              'attendances' => $attendanceRecords,
              'period' => [
                  'id' => $payrollPeriod->id,
                  'period_start' => $startDate,
                  'period_end' => $endDate,
                  'week_id' => $payrollPeriod->week_id ?? null,
              ],
          ]);
      } catch (\Exception $e) {
          Log::error('Error fetching attendance for payslip: ' . $e->getMessage());
          return response()->json([
              'success' => false,
              'message' => 'Failed to fetch attendance records: ' . $e->getMessage(),
          ], 500);
      }
  }

  public function generatePayslip($employeeNumber) 
  {
      // Find employee by employee_number instead of ID
      $employee = Employee::where('employee_number', $employeeNumber)->firstOrFail();
      
      $pdf = Pdf::loadView('payslip', compact('employee'))->setPaper('A4', 'portrait');
  
      return $pdf->stream("payslip-{$employeeNumber}.pdf");
  }

  // Helper Methods
  private function generateDefaultAttendanceRecords($employee, $startDate, $endDate) {
      $records = [];
      $currentDate = new \DateTime($startDate);
      $endDateTime = new \DateTime($endDate);
      $id = 10000;

      while ($currentDate <= $endDateTime) {
          $dateStr = $currentDate->format('Y-m-d');
          $status = "Present";

          $records[] = [
              'id' => $id++,
              'employee_number' => $employee->employee_number,
              'work_date' => $dateStr,
              'daily_rate' => $employee->daily_rate,
              'adjustment' => 0,
              'status' => $status,
              'time_in' => '08:00:00',
              'time_out' => '17:00:00',
              'full_name' => $employee->full_name,
          ];

          $currentDate->modify('+1 day');
      }

      return collect($records);
  }

  // Deduction Calculations
  public function calculateSSS($grossPay) {
    // Convert weekly gross pay to monthly for calculation
    $monthlyRate = $grossPay * 4;
    
    // Calculate SSS based on 2025 rates (5% employee contribution)
    if ($monthlyRate <= 4000) {
        return (4000 * 0.05) / 4; // Convert back to weekly
    } else if ($monthlyRate > 30000) {
        return (30000 * 0.05) / 4; // Convert back to weekly
    } else {
        // Round to the nearest 500 for MSC determination
        $msc = ceil($monthlyRate / 500) * 500;
        return ($msc * 0.05) / 4; // Convert back to weekly
    }
  }

  public function calculatePhilhealth($grossPay) {
    // Convert weekly gross pay to monthly for calculation
    $monthlyRate = $grossPay * 4;
    
    // Calculate PhilHealth based on 2025 rates (5% total, 2.5% employee contribution)
    if ($monthlyRate < 10000) {
        return (10000 * 0.025) / 4; // Convert back to weekly
    } else if ($monthlyRate > 100000) {
        return (100000 * 0.025) / 4; // Convert back to weekly
    } else {
        return ($monthlyRate * 0.025) / 4; // Convert back to weekly
    }
  }

  public function calculatePagibig($grossPay) {
    // Convert weekly gross pay to monthly for calculation
    $monthlyRate = $grossPay * 4;
    
    // Calculate Pag-IBIG based on 2025 rates (2% with max of ₱200)
    return (min($monthlyRate * 0.02, 200)) / 4; // Convert back to weekly
  }

  public function calculateTax($grossPay) {
    // Convert weekly gross pay to monthly and annual
    $monthlyRate = $grossPay * 4;
    $annualRate = $monthlyRate * 12;
    
    // Calculate deductions to get taxable income
    $sssMonthly = $this->calculateSSS($grossPay) * 4; // Convert weekly to monthly
    $philhealthMonthly = $this->calculatePhilhealth($grossPay) * 4; // Convert weekly to monthly
    $pagibigMonthly = $this->calculatePagibig($grossPay) * 4; // Convert weekly to monthly
    
    // Calculate annual taxable income
    $annualDeductions = ($sssMonthly + $philhealthMonthly + $pagibigMonthly) * 12;
    $taxableIncome = $annualRate - $annualDeductions;
    
    // Apply 2025 tax rates
    $tax = 0;
    if ($taxableIncome <= 250000) {
        $tax = 0; // Exempt
    } else if ($taxableIncome <= 400000) {
        $tax = ($taxableIncome - 250000) * 0.15; // 15% of excess over 250,000
    } else if ($taxableIncome <= 800000) {
        $tax = 22500 + ($taxableIncome - 400000) * 0.20; // 22,500 + 20% of excess over 400,000
    } else if ($taxableIncome <= 2000000) {
        $tax = 102500 + ($taxableIncome - 800000) * 0.25; // 102,500 + 25% of excess over 800,000
    } else if ($taxableIncome <= 8000000) {
        $tax = 402500 + ($taxableIncome - 2000000) * 0.30; // 402,500 + 30% of excess over 2,000,000
    } else {
        $tax = 2202500 + ($taxableIncome - 8000000) * 0.35; // 2,202,500 + 35% of excess over 8,000,000
    }
    
    // Convert annual tax to weekly
    return $tax / 52;
  }

  public function updateGrossPayFromAttendance($payrollEntryId)
  {
    try {
        DB::beginTransaction();
        
        // Find the payroll entry
        $payroll = PayrollEntry::with('payrollPeriod')->findOrFail($payrollEntryId);
        $employee = Employee::where('employee_number', $payroll->employee_number)->first();
        
        if (!$employee) {
            throw new \Exception('Employee not found');
        }
        
        if (!$payroll->payrollPeriod) {
            throw new \Exception('Payroll period not found');
        }
        
        // Get attendance records for this period
        $attendanceRecords = Attendance::where('employee_number', $payroll->employee_number)
            ->whereBetween('work_date', [$payroll->payrollPeriod->period_start, $payroll->payrollPeriod->period_end])
            ->get();
        
        // Calculate gross pay based on attendance
        $grossPay = 0;
        
        foreach ($attendanceRecords as $record) {
            $status = $record->status;
            $dailyRate = $record->daily_rate ?? $employee->daily_rate ?? 0;
            $adjustment = $record->adjustment ?? 0;
            
            // Calculate pay based on status
            $amount = match (strtolower($status)) {
                'present' => $dailyRate * 1, // Present * 1
                'absent' => $dailyRate * 0, // Absent * 0
                'day off' => $dailyRate * 0, // Day Off * 0
                'half day' => $dailyRate / 2, // Half Day / 2
                'holiday' => str_contains(strtolower($record->holiday_type ?? ''), 'regular') ? $dailyRate * 1.3 : $dailyRate * 2, // Holiday logic
                'leave' => $dailyRate * 0, // Leave * 0
                'wfh' => $dailyRate * 1, // WFH * 1
                'sp' => $dailyRate * 1, // SP * 1
                default => $dailyRate,
            };
            
            $grossPay += $amount + $adjustment;
        }
        
        // Update the payroll entry
        $payroll->gross_pay = $grossPay;
        
        // Recalculate deductions
        $payroll->sss_deduction = $this->calculateSSS($grossPay);
        $payroll->philhealth_deduction = $this->calculatePhilhealth($grossPay);
        $payroll->pagibig_deduction = $this->calculatePagibig($grossPay);
        $payroll->tax_deduction = $this->calculateTax($grossPay);
        
        // Recalculate total deductions
        $totalDeductions = $payroll->sss_deduction +
                          $payroll->philhealth_deduction +
                          $payroll->pagibig_deduction +
                          $payroll->tax_deduction +
                          $payroll->cash_advance +
                          $payroll->loan +
                          $payroll->vat +
                          $payroll->other_deductions +
                          $payroll->short;
                          
        $payroll->total_deductions = $totalDeductions;
        
        $payroll->save();
        
        DB::commit();
        
        return [
            'success' => true,
            'message' => 'Gross pay updated successfully',
            'payroll' => $payroll->fresh()
        ];
    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error updating gross pay: ' . $e->getMessage());
        
        return [
            'success' => false,
            'message' => 'Failed to update gross pay: ' . $e->getMessage()
        ];
    }
  }

  public function recalculateGrossPay(Request $request, $id)
  {
    $result = $this->updateGrossPayFromAttendance($id);
    
    if ($request->wantsJson()) {
        return response()->json($result, $result['success'] ? 200 : 500);
    }
    
    if ($result['success']) {
        return redirect()->back()->with('success', $result['message']);
    } else {
        return redirect()->back()->with('error', $result['message']);
    }
  }
}

