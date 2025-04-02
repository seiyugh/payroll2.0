<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DesignationController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LeaveRequestController;
use App\Http\Controllers\PayrollController;
use App\Http\Controllers\PayrollAutomationController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Inertia\Inertia;

// Public home page
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
    ]);
})->name('home');

// Legacy home route (if needed)
Route::get('/home', [HomeController::class, 'index'])->name('home.legacy');

// Authenticated user routes
Route::middleware(['auth', 'verified'])->group(function () {
    // Dashboard route
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Notes route - added for sticky notes feature
    Route::get('/notes', function () {
        return Inertia::render('Notes/Index');
    })->name('notes.index');


    Route::middleware(['auth'])->group(function () {
        // User management routes
        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::put('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
    });
    
    // Profile routes
    Route::prefix('profile')->group(function () {
        Route::get('/', [ProfileController::class, 'edit'])->name('profile.edit');
        Route::patch('/', [ProfileController::class, 'update'])->name('profile.update');
        Route::delete('/', [ProfileController::class, 'destroy'])->name('profile.destroy');
    });

    // Resource routes
    Route::resource('roles', RoleController::class);
    Route::resource('users', UserController::class);
    Route::resource('products', ProductController::class);
    Route::resource('departments', DepartmentController::class);
    Route::resource('designations', DesignationController::class);
    
    // Employees Routes
    Route::prefix('employees')->group(function () {
        Route::get('/', [EmployeeController::class, 'index'])->name('employees.index');
        Route::get('/create', [EmployeeController::class, 'create'])->name('employees.create');
        Route::post('/', [EmployeeController::class, 'store'])->name('employees.store');
        Route::get('/{id}', [EmployeeController::class, 'show'])->name('employees.show');
        Route::get('/{id}/edit', [EmployeeController::class, 'edit'])->name('employees.edit');
        Route::put('/{id}', [EmployeeController::class, 'update'])->name('employees.update');
        Route::delete('/{id}', [EmployeeController::class, 'destroy'])->name('employees.destroy');
        Route::post('/bulk-store', [EmployeeController::class, 'bulkStore'])->name('employees.bulk.store');
    });

    // Leave Requests
    Route::resource('leave-requests', LeaveRequestController::class);
    Route::put('/payroll/{id}', [PayrollController::class, 'update'])->name('payroll.update');

    // Payroll Routes
    Route::prefix('payroll')->group(function () {
        // Basic CRUD routes
        Route::get('/', [PayrollController::class, 'index'])->name('payroll.index');
        Route::post('/', [PayrollController::class, 'store'])->name('payroll.store');
        Route::get('/{id}', [PayrollController::class, 'show'])->name('payroll.show');
        Route::put('/{id}', [PayrollController::class, 'update'])->name('payroll.update');
        Route::delete('/{id}', [PayrollController::class, 'destroy'])->name('payroll.destroy');
       
        
        // Legacy routes (keeping for backward compatibility)
        Route::get('/create', [PayrollController::class, 'create'])->name('payroll.create');
        Route::post('/store', [PayrollController::class, 'store'])->name('payroll.store.legacy');
        Route::get('/show/{id}', [PayrollController::class, 'show'])->name('payroll.show.legacy');
        Route::get('/edit/{id}', [PayrollController::class, 'edit'])->name('payroll.edit');
        Route::put('/update/{id}', [PayrollController::class, 'update'])->name('payroll.update.legacy');
        Route::post('/update', [PayrollController::class, 'update'])->name('payroll.update.legacy');
        Route::delete('/destroy/{id}', [PayrollController::class, 'destroy'])->name('payroll.destroy.legacy');
        
        // Payroll entries and generation
        Route::post('/entries', [PayrollController::class, 'store'])->name('payroll.entries.store');
        Route::post('/generate', [PayrollController::class, 'generatePayroll'])->name('payroll.generate');
        Route::get('/generate/{employee_id}', [PayrollController::class, 'generate'])->name('payroll.generate.employee');
        Route::post('/calculate', [PayrollController::class, 'calculate'])->name('payroll.calculate');
        Route::post('/generate-from-attendance', [PayrollController::class, 'generateFromAttendance'])->name('payroll.generate-from-attendance');
    
        // Payroll Periods
        Route::post('/periods', [PayrollController::class, 'createPeriod'])->name('payroll.periods.create');
        Route::get('/periods', [PayrollController::class, 'listPeriods'])->name('payroll.periods.list');
        Route::put('/periods/{id}', [PayrollController::class, 'updatePeriod'])->name('payroll.periods.update');
        Route::delete('/periods/{id}', [PayrollController::class, 'destroyPeriod'])->name('payroll.periods.destroy');
        
        // Payroll Automation
        Route::prefix('automation')->group(function () {
            Route::get('/', [PayrollAutomationController::class, 'index'])->name('payroll.automation');
            Route::post('/generate', [PayrollAutomationController::class, 'generatePayrolls'])->name('payroll.automation.generate');
            Route::post('/send-emails', [PayrollAutomationController::class, 'sendPayslipEmails'])->name('payroll.automation.send-emails');
        });

        // Payroll printing and payslips
        Route::get('/{id}/print', [PayrollController::class, 'printPayslip'])->name('payroll.print');
        Route::post('/{id}/print', [PayrollController::class, 'printPayslip'])->name('payroll.print.post');
        Route::get('/payslip/{id}', [PayrollController::class, 'payslip'])->name('payroll.payslip');
        Route::get('/payslip/download/{id}', [PayrollController::class, 'downloadPayslip'])->name('payroll.payslip.download');
        
        // Fetch attendance for payslip - this is the route we need for the modals
        Route::get('/fetch-attendance-for-payslip', [PayrollController::class, 'fetchAttendanceForPayslip'])
            ->name('payroll.fetch-attendance-for-payslip');
    });

    // Attendance Routes
    Route::prefix('attendance')->group(function () {
        // Basic CRUD routes
        Route::get('/', [AttendanceController::class, 'index'])->name('attendance.index');
        Route::get('/create', [AttendanceController::class, 'create'])->name('attendance.create');
        Route::post('/', [AttendanceController::class, 'store'])->name('attendance.store');
        Route::get('/{id}', [AttendanceController::class, 'show'])->name('attendance.show');
        Route::get('/{id}/edit', [AttendanceController::class, 'edit'])->name('attendance.edit');
        Route::put('/{id}', [AttendanceController::class, 'update'])->name('attendance.update');
        Route::delete('/{id}', [AttendanceController::class, 'destroy'])->name('attendance.destroy');

        // Legacy routes
        Route::get('/attendances/mark', [AttendanceController::class, 'markAttendance'])->name('attendances.mark');
        Route::post('/attendances/store', [AttendanceController::class, 'storeAttendance'])->name('attendances.store');
        Route::put('/attendances/update/{id}', [AttendanceController::class, 'update'])->name('attendances.update');

        // Bulk operations
        Route::match(['put', 'post'], '/bulk-update', [AttendanceController::class, 'bulkUpdate'])->name('attendance.bulk.update');
        Route::post('/bulk', [AttendanceController::class, 'bulkStore'])->name('attendance.bulk.store');
        Route::post('/bulk-upload', [AttendanceController::class, 'bulkUpload'])->name('attendance.bulk.upload');
        Route::get('/export', [AttendanceController::class, 'export'])->name('attendance.export');
        
        // Checking and deletion
        Route::get('/check-existing', [AttendanceController::class, 'checkExisting'])->name('attendance.check-existing');
        Route::get('/check-bulk-existing', [AttendanceController::class, 'checkBulkExisting'])->name('attendance.check-bulk-existing');
        Route::post('/bulk-delete', [AttendanceController::class, 'bulkDelete'])->name('attendance.bulk-delete');
        
        // Fetch for payroll - legacy route, redirects to the new route
        Route::get('/fetch-for-payroll', [AttendanceController::class, 'fetchForPayroll'])
            ->name('attendance.fetch-for-payroll');

            Route::post('/attendance/update-from-payslip', [App\Http\Controllers\AttendanceController::class, 'updateFromPayslip'])->name('attendance.update-from-payslip');
    });
});

// Include additional route files
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

