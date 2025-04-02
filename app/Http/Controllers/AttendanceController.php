<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\PayrollPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        // Set default date to today if no date filter is provided
        $date = $request->date ?: date('Y-m-d');
        
        $query = DB::table('attendance')
            ->select(
                'attendance.id',
                'attendance.employee_number',
                'attendance.work_date',
                'attendance.daily_rate',
                'attendance.adjustment',
                'attendance.status',
                'employees.full_name'
            )
            ->leftJoin('employees', 'attendance.employee_number', '=', 'employees.employee_number');
        
        // Apply search filter
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('attendance.employee_number', 'like', "%{$search}%")
                  ->orWhere('employees.full_name', 'like', "%{$search}%");
            });
        }
        
        // Apply status filter
        if ($request->has('status') && !empty($request->status)) {
            $query->where('attendance.status', $request->status);
        }
        
        // Apply date filter - only if explicitly provided in the request
        if ($request->has('date')) {
            if (!empty($request->date)) {
                $query->where('attendance.work_date', $request->date);
            }
        }
        
        // Apply sorting
        $query->orderBy('attendance.work_date', 'desc');
        
        // Get paginated results
        $attendances = $query->paginate(15)->withQueryString();

        // Fetch all attendance records for summary calculations
        $allAttendances = DB::table('attendance')
            ->select(
                'attendance.id',
                'attendance.employee_number',
                'attendance.work_date',
                'attendance.daily_rate',
                'attendance.adjustment',
                'attendance.status',
                'employees.full_name'
            )
            ->leftJoin('employees', 'attendance.employee_number', '=', 'employees.employee_number')
            ->get();
        
        $employees = Employee::select('id', 'employee_number', 'full_name', 'daily_rate')->get();
        $payrollPeriods = DB::table('payroll_periods')->get();

        return Inertia::render('Attendance/Index', [
            'attendances' => $attendances,
            'allAttendances' => $allAttendances, // Pass all attendance records
            'employees' => $employees,
            'payrollPeriods' => $payrollPeriods,
            'filters' => $request->only(['search', 'status', 'date']),
        ]);
    }

    public function create()
    {
        $employees = Employee::select('id', 'employee_number', 'full_name', 'daily_rate')->get();
        
        return Inertia::render('Attendance/Create', [
            'employees' => $employees
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_number' => 'required|string',
            'work_date' => 'required|date',
            'daily_rate' => 'required|numeric',
            'adjustment' => 'nullable|numeric',
            'status' => 'required|string',
        ]);

        // Check if attendance record already exists
        $exists = DB::table('attendance')
            ->where('employee_number', $validated['employee_number'])
            ->where('work_date', $validated['work_date'])
            ->exists();

        if ($exists) {
            return redirect()->back()->withErrors([
                'duplicate' => 'An attendance record already exists for this employee on this date.'
            ]);
        }

        DB::table('attendance')->insert($validated);

        return redirect()->back()->with('success', 'Attendance record created successfully');
    }

    public function show($id)
    {
        $attendance = DB::table('attendance')
            ->select(
                'attendance.id',
                'attendance.employee_number',
                'attendance.work_date',
                'attendance.daily_rate',
                'attendance.adjustment',
                'attendance.status',
                'employees.full_name'
            )
            ->leftJoin('employees', 'attendance.employee_number', '=', 'employees.employee_number')
            ->where('attendance.id', $id)
            ->first();

        if (!$attendance) {
            return redirect()->route('attendance.index')->with('error', 'Attendance record not found');
        }

        return Inertia::render('Attendance/Show', [
            'attendance' => $attendance
        ]);
    }

    public function edit($id)
    {
        $attendance = DB::table('attendance')
            ->select(
                'attendance.id',
                'attendance.employee_number',
                'attendance.work_date',
                'attendance.daily_rate',
                'attendance.adjustment',
                'attendance.status',
                'employees.full_name'
            )
            ->leftJoin('employees', 'attendance.employee_number', '=', 'employees.employee_number')
            ->where('attendance.id', $id)
            ->first();

        if (!$attendance) {
            return redirect()->route('attendance.index')->with('error', 'Attendance record not found');
        }

        $employees = Employee::select('id', 'employee_number', 'full_name', 'daily_rate')->get();

        return Inertia::render('Attendance/Edit', [
            'attendance' => $attendance,
            'employees' => $employees
        ]);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'employee_number' => 'required|string',
            'work_date' => 'required|date',
            'daily_rate' => 'required|numeric',
            'adjustment' => 'nullable|numeric',
            'status' => 'required|string',
        ]);

        $attendance = DB::table('attendance')->where('id', $id)->first();
        
        if (!$attendance) {
            return redirect()->route('attendance.index')->with('error', 'Attendance record not found');
        }

        // Check if we're changing the date and if a record already exists for that date
        if ($attendance->work_date != $validated['work_date']) {
            $exists = DB::table('attendance')
                ->where('employee_number', $validated['employee_number'])
                ->where('work_date', $validated['work_date'])
                ->where('id', '!=', $id)
                ->exists();

            if ($exists) {
                return redirect()->back()->withErrors([
                    'duplicate' => 'An attendance record already exists for this employee on this date.'
                ]);
            }
        }

        DB::table('attendance')->where('id', $id)->update($validated);

        return redirect()->back()->with('success', 'Attendance record updated successfully');
    }

    public function destroy($id)
    {
        $attendance = DB::table('attendance')->where('id', $id)->first();
        
        if (!$attendance) {
            return redirect()->route('attendance.index')->with('error', 'Attendance record not found');
        }

        DB::table('attendance')->where('id', $id)->delete();

        return redirect()->back()->with('success', 'Attendance record deleted successfully');
    }

    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'work_date' => 'required|date',
            'employee_numbers' => 'required|array',
            'status' => 'required|string',
        ]);

        // Check for existing records
        $existingEmployees = DB::table('attendance')
            ->where('work_date', $validated['work_date'])
            ->whereIn('employee_number', $validated['employee_numbers'])
            ->pluck('employee_number')
            ->toArray();

        if (count($existingEmployees) > 0) {
            // If all employees already have records
            if (count($existingEmployees) == count($validated['employee_numbers'])) {
                return redirect()->back()->withErrors([
                    'duplicate' => 'All selected employees already have attendance records for this date.'
                ]);
            }

            // Filter out employees that already have records
            $filteredEmployeeNumbers = array_diff($validated['employee_numbers'], $existingEmployees);
            
            // If user wants to proceed with remaining employees, they should confirm
            if (empty($filteredEmployeeNumbers)) {
                return redirect()->back()->withErrors([
                    'duplicate' => 'All selected employees already have attendance records for this date.'
                ]);
            }
            
            $validated['employee_numbers'] = $filteredEmployeeNumbers;
        }

        $records = [];
        foreach ($validated['employee_numbers'] as $employeeNumber) {
            $employee = Employee::where('employee_number', $employeeNumber)->first();
            
            if ($employee) {
                $records[] = [
                    'employee_number' => $employeeNumber,
                    'work_date' => $validated['work_date'],
                    'daily_rate' => $employee->daily_rate,
                    'adjustment' => 0,
                    'status' => $validated['status'],
                ];
            }
        }

        DB::table('attendance')->insert($records);

        return redirect()->back()->with('success', 'Bulk attendance records created successfully');
    }

    public function bulkUpload(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls',
        ]);

        // Process file upload logic here
        // This would typically involve reading the file and creating attendance records

        return redirect()->back()->with('success', 'Attendance records uploaded successfully');
    }

    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'attendances' => 'required|array',
            'attendances.*.id' => 'required|integer|exists:attendance,id',
            'attendances.*.status' => 'required|string',
        ]);

        foreach ($validated['attendances'] as $attendanceData) {
            $attendance = Attendance::find($attendanceData['id']);
            if ($attendance) {
                $attendance->update(['status' => $attendanceData['status']]);
            }
        }

        return redirect()->back()->with('success', 'Attendance records updated successfully');
    }

    public function export()
    {
        $attendances = DB::table('attendance')
            ->select(
                'attendance.id',
                'attendance.employee_number',
                'attendance.work_date',
                'attendance.daily_rate',
                'attendance.adjustment',
                'attendance.status',
                'employees.full_name'
            )
            ->leftJoin('employees', 'attendance.employee_number', '=', 'employees.employee_number')
            ->orderBy('attendance.work_date', 'desc')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set headers
        $sheet->setCellValue('A1', 'ID');
        $sheet->setCellValue('B1', 'Employee Number');
        $sheet->setCellValue('C1', 'Employee Name');
        $sheet->setCellValue('D1', 'Work Date');
        $sheet->setCellValue('E1', 'Daily Rate');
        $sheet->setCellValue('F1', 'Adjustment');
        $sheet->setCellValue('G1', 'Total');
        $sheet->setCellValue('H1', 'Status');
        
        // Add data
        $row = 2;
        foreach ($attendances as $attendance) {
            $sheet->setCellValue('A' . $row, $attendance->id);
            $sheet->setCellValue('B' . $row, $attendance->employee_number);
            $sheet->setCellValue('C' . $row, $attendance->full_name);
            $sheet->setCellValue('D' . $row, $attendance->work_date);
            $sheet->setCellValue('E' . $row, $attendance->daily_rate);
            $sheet->setCellValue('F' . $row, $attendance->adjustment);
            $sheet->setCellValue('G' . $row, $attendance->daily_rate + $attendance->adjustment);
            $sheet->setCellValue('H' . $row, $attendance->status);
            $row++;
        }
        
        // Create file
        $writer = new Xlsx($spreadsheet);
        $filename = 'attendance_export_' . date('Y-m-d') . '.xlsx';
        
        // Save to temp file
        $tempFile = tempnam(sys_get_temp_dir(), 'attendance');
        $writer->save($tempFile);
        
        // Return as download
        return Response::download($tempFile, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }

    // Modify the fetchForPayslip method to better handle attendance records
    public function fetchForPayslip(Request $request)
    {
        try {
            Log::info('Fetching attendance records for payslip with request:', $request->all());
            
            $validated = $request->validate([
                'week_id' => 'required|exists:payroll_periods,week_id',
                'employee_number' => 'nullable|exists:employees,employee_number',
            ]);

            // Find the payroll period first to get the date range
            $period = PayrollPeriod::where('week_id', $validated['week_id'])->first();
            
            if (!$period) {
                Log::error('Payroll period not found for week_id: ' . $validated['week_id']);
                return response()->json([
                    'success' => false,
                    'message' => 'Payroll period not found',
                ], 404);
            }

            Log::info('Found payroll period:', [
                'week_id' => $period->week_id,
                'period_start' => $period->period_start,
                'period_end' => $period->period_end
            ]);

            // Build the query for attendance records
            $query = Attendance::whereBetween('work_date', [$period->period_start, $period->period_end]);
            
            // If employee_number is provided, filter by it
            if (isset($validated['employee_number'])) {
                $query->where('employee_number', $validated['employee_number']);
            }
            
            // Get the attendance records
            $attendanceRecords = $query->orderBy('work_date')->get();

            Log::info('Fetched attendance records:', [
                'count' => $attendanceRecords->count(),
                'date_range' => [$period->period_start, $period->period_end]
            ]);

            return response()->json([
                'success' => true,
                'attendances' => $attendanceRecords,
                'count' => $attendanceRecords->count(),
                'period' => [
                    'id' => $period->id,
                    'week_id' => $period->week_id,
                    'period_start' => $period->period_start,
                    'period_end' => $period->period_end,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching attendance records: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function fetchForPayroll(Request $request)
    {
        try {
            $validated = $request->validate([
                'employee_number' => 'required|exists:employees,employee_number',
                'week_id' => 'required|exists:payroll_periods,week_id',
            ]);

            // Get the payroll period
            $payrollPeriod = PayrollPeriod::where('week_id', $validated['week_id'])->firstOrFail();
            
            // Get attendance records for this employee in the period
            $attendanceRecords = Attendance::where('employee_number', $validated['employee_number'])
                ->whereBetween('work_date', [$payrollPeriod->period_start, $payrollPeriod->period_end])
                ->orderBy('work_date')
                ->get();
                
            // If no records found, generate default records
            if ($attendanceRecords->isEmpty()) {
                $employee = Employee::where('employee_number', $validated['employee_number'])->first();
                
                if ($employee) {
                    $attendanceRecords = $this->generateDefaultAttendanceRecords(
                        $employee,
                        $payrollPeriod->period_start,
                        $payrollPeriod->period_end
                    );
                }
            }

            return Inertia::render('Payroll/Index', [
                'attendances' => $attendanceRecords,
                'period' => [
                    'id' => $payrollPeriod->id,
                    'period_start' => $payrollPeriod->period_start,
                    'period_end' => $payrollPeriod->period_end,
                    'week_id' => $payrollPeriod->week_id,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching attendance for payroll: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Generate default attendance records for an employee
     */
   /**
     * Generate default attendance records for an employee
     */
    private function generateDefaultAttendanceRecords($employee, $startDate, $endDate) {
        $records = [];
        $currentDate = new \DateTime($startDate);
        $endDateTime = new \DateTime($endDate);
        $id = 10000;

        while ($currentDate <= $endDateTime) {
            $dateStr = $currentDate->format('Y-m-d');
            $dayOfWeek = $currentDate->format('N'); // 1 (Monday) to 7 (Sunday)
            
            // Default status based on day of week
            $status = ($dayOfWeek >= 6) ? 
                "Day Off" : "Present";

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

    /**
     * Check if an attendance record exists for a specific employee and date
     */
    public function checkExisting(Request $request)
    {
        $request->validate([
            'employee_number' => 'required|string',
            'work_date' => 'required|date',
            'exclude_id' => 'nullable|integer',
        ]);

        $query = DB::table('attendance')
            ->where('employee_number', $request->employee_number)
            ->where('work_date', $request->work_date);

        // Exclude the current record if updating
        if ($request->has('exclude_id')) {
            $query->where('id', '!=', $request->exclude_id);
        }

        $exists = $query->exists();

        return Inertia::render('Attendance/Index', [
            'exists' => $exists,
        ])->withViewData(['exists' => $exists]);
    }

    /**
     * Check if attendance records exist for multiple employees on a specific date
     */
    public function checkBulkExisting(Request $request)
    {
        $request->validate([
            'employee_numbers' => 'required|array',
            'work_date' => 'required|date',
        ]);

        $existingEmployees = DB::table('attendance')
            ->where('work_date', $request->work_date)
            ->whereIn('employee_number', $request->employee_numbers)
            ->pluck('employee_number')
            ->toArray();

        return Inertia::render('Attendance/Index', [
            'existingEmployees' => $existingEmployees,
        ])->withViewData(['existingEmployees' => $existingEmployees]);
    }

    /**
     * Bulk delete attendance records
     */
    public function bulkDelete(Request $request)
    {
        if ($request->has('date')) {
            // Single date deletion
            $request->validate([
                'employee_numbers' => 'required|array',
                'date' => 'required|date',
            ]);

            $deleted = DB::table('attendance')
                ->where('work_date', $request->date)
                ->whereIn('employee_number', $request->employee_numbers)
                ->delete();

            return redirect()->back()->with('success', $deleted . ' attendance records deleted successfully');
        } else {
            // Date range deletion
            $request->validate([
                'employee_numbers' => 'required|array',
                'start_date' => 'required|date',
                'end_date' => 'required|date',
            ]);

            $deleted = DB::table('attendance')
                ->whereBetween('work_date', [$request->start_date, $request->end_date])
                ->whereIn('employee_number', $request->employee_numbers)
                ->delete();

            return redirect()->back()->with('success', $deleted . ' attendance records deleted successfully');
        }
    }
    public function getAttendanceForPayslip(Request $request)
    {
        try {
            Log::info('Fetching attendance records for payslip with request:', $request->all());
            
            $validated = $request->validate([
                'employee_number' => 'required|exists:employees,employee_number',
                'week_id' => 'required|exists:payroll_periods,week_id',
            ]);

            // Find the payroll period first to get the date range
            $period = PayrollPeriod::where('week_id', $validated['week_id'])->first();
            
            if (!$period) {
                Log::error('Payroll period not found for week_id: ' . $validated['week_id']);
                return response()->json([
                    'success' => false,
                    'message' => 'Payroll period not found',
                ], 404);
            }

            Log::info('Found payroll period:', [
                'week_id' => $period->week_id,
                'period_start' => $period->period_start,
                'period_end' => $period->period_end
            ]);

            // Now fetch attendance records using the period's date range
            $attendanceRecords = Attendance::where('employee_number', $validated['employee_number'])
                ->whereBetween('work_date', [$period->period_start, $period->period_end])
                ->orderBy('work_date')
                ->get();

            Log::info('Fetched attendance records:', [
                'count' => $attendanceRecords->count(),
                'employee_number' => $validated['employee_number'],
                'date_range' => [$period->period_start, $period->period_end]
            ]);

            // If no records found, generate default ones
            if ($attendanceRecords->isEmpty()) {
                Log::info('No attendance records found, generating defaults');
                
                $employee = Employee::where('employee_number', $validated['employee_number'])->first();
                
                if ($employee) {
                    $attendanceRecords = $this->generateDefaultAttendanceRecords(
                        $employee,
                        $period->period_start,
                        $period->period_end
                    );
                    
                    Log::info('Generated default attendance records:', [
                        'count' => $attendanceRecords->count()
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'attendances' => $attendanceRecords,
                'count' => $attendanceRecords->count(),
                'period' => [
                    'id' => $period->id,
                    'week_id' => $period->week_id,
                    'period_start' => $period->period_start,
                    'period_end' => $period->period_end,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching attendance records: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance records: ' . $e->getMessage(),
            ], 500);
        }
    }
    public function updateFromPayslip(Request $request)
    {
        try {
            // Validate the request
            $validated = $request->validate([
                'employee_number' => 'required|string|exists:employees,employee_number',
                'week_id' => 'required|exists:payroll_periods,week_id',
                'attendance_records' => 'required|array',
                'attendance_records.*.work_date' => 'required|date',
                'attendance_records.*.daily_rate' => 'required|numeric',
                'attendance_records.*.adjustment' => 'nullable|numeric',
                'attendance_records.*.status' => 'required|string',
            ]);

            Log::info('Updating attendance records from payslip', [
                'employee_number' => $validated['employee_number'],
                'week_id' => $validated['week_id'],
                'record_count' => count($validated['attendance_records'])
            ]);

            // Get the payroll period to determine date range
            $payrollPeriod = DB::table('payroll_periods')
                ->where('week_id', $validated['week_id'])
                ->first();

            if (!$payrollPeriod) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payroll period not found'
                ], 404);
            }

            // Begin transaction
            DB::beginTransaction();

            // Process each attendance record
            foreach ($validated['attendance_records'] as $record) {
                // Check if an attendance record already exists for this date and employee
                $existingRecord = Attendance::where('employee_number', $validated['employee_number'])
                    ->where('work_date', $record['work_date'])
                    ->first();

                if ($existingRecord) {
                    // Update existing record
                    $existingRecord->update([
                        'daily_rate' => $record['daily_rate'],
                        'adjustment' => $record['adjustment'] ?? 0,
                        'status' => $record['status'],
                    ]);

                    Log::info('Updated existing attendance record', [
                        'id' => $existingRecord->id,
                        'work_date' => $record['work_date']
                    ]);
                } else {
                    // Create new record
                    Attendance::create([
                        'employee_number' => $validated['employee_number'],
                        'work_date' => $record['work_date'],
                        'daily_rate' => $record['daily_rate'],
                        'adjustment' => $record['adjustment'] ?? 0,
                        'status' => $record['status'],
                    ]);

                    Log::info('Created new attendance record', [
                        'employee_number' => $validated['employee_number'],
                        'work_date' => $record['work_date']
                    ]);
                }
            }

            // Commit transaction
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Attendance records updated successfully',
                'count' => count($validated['attendance_records'])
            ]);
        } catch (\Exception $e) {
            // Rollback transaction on error
            DB::rollBack();
            
            Log::error('Error updating attendance records from payslip: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update attendance records: ' . $e->getMessage()
            ], 500);
        }
    }
   
}