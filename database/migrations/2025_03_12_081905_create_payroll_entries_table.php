<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payroll_entries', function (Blueprint $table) {
            $table->id();
            $table->string('employee_number');
            $table->unsignedInteger('week_id'); // Only week_id as foreign key
            
            // Payroll fields
            $table->decimal('daily_rate', 10, 2)->nullable(); // Will be populated from employees table
            $table->decimal('gross_pay', 10, 2);
            $table->decimal('sss_deduction', 10, 2)->default(0.00);
            $table->decimal('philhealth_deduction', 10, 2)->default(0.00);
            $table->decimal('pagibig_deduction', 10, 2)->default(0.00);
            $table->decimal('tax_deduction', 10, 2)->default(0.00);
            $table->decimal('cash_advance', 10, 2)->default(0.00);
            $table->decimal('loan', 10, 2)->default(0.00);
            $table->decimal('vat', 10, 2)->default(0.00);
            $table->decimal('other_deductions', 10, 2)->default(0.00);
            $table->decimal('short', 10, 2)->default(0.00); // Added short column (not included in calculations)
            
            // Virtual and computed fields
            $table->decimal('total_deductions', 10, 2)->virtualAs('
                sss_deduction + philhealth_deduction + pagibig_deduction + 
                tax_deduction + cash_advance + loan + vat + other_deductions
                -- Note: short is intentionally excluded from calculations
            ');
            
            // Net pay is now calculated as gross_pay - total_deductions
            $table->decimal('net_pay', 10, 2)->virtualAs('gross_pay - total_deductions');
            
            $table->decimal('ytd_earnings', 10, 2)->default(0.00);
            $table->decimal('thirteenth_month_pay', 10, 2)->default(0.00);
            $table->string('status')->default('Pending');
            $table->timestamps();

            // Foreign keys
            $table->foreign('employee_number')
                  ->references('employee_number')
                  ->on('employees')
                  ->onDelete('cascade');
                  
            $table->foreign('week_id')
                  ->references('week_id')
                  ->on('payroll_periods')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_entries');
    }
};