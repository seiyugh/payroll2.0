<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            $table->string('employee_number', 255);
            $table->date('work_date');
            $table->decimal('daily_rate', 10, 2);
            $table->decimal('adjustment', 10, 2)->default(0);
            $table->enum('status', ['Present', 'Absent', 'Day Off', 'Holiday', 'Leave', 'WFH', 'Half Day', 'SP'])->default('Present');
            $table->timestamps();

            // Constraints
            $table->foreign('employee_number')->references('employee_number')->on('employees')->onDelete('cascade');
            $table->unique(['employee_number', 'work_date']); // Prevent duplicate attendance entries
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
