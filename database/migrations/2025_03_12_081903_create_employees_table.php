<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('employee_number', 10)->unique();
            $table->string('full_name');
            $table->string('last_name');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('id_no')->nullable();
            $table->string('gender');
            $table->string('civil_status');
            $table->string('position');
            $table->string('department');
            $table->text('assigned_area')->nullable();
            $table->text('address');
            $table->integer('age');
            $table->date('birthdate');
            $table->string('birth_place')->nullable();
            $table->string('contacts');
            $table->date('date_hired');
            $table->integer('years_of_service');
            $table->enum('employment_status',['Regular', 'Probationary','Project-Based' ]);
            $table->decimal('daily_rate', 10, 2);
            $table->date('date_terminated_resigned')->nullable();
            $table->string('sss_no')->nullable();
            $table->string('tin_no')->nullable();
            $table->string('philhealth_no')->nullable();
            $table->string('pagibig_no')->nullable();
            $table->string('ub_account')->nullable();
            $table->string('emergency_contact_name');
            $table->string('emergency_contact_mobile');
            $table->string('email')->nullable();
            $table->boolean('resume')->nullable();
            $table->string('id_status')->nullable();
            $table->boolean('government_id')->default(false);
            $table->enum('type_of_id', [
                'PhilID',
                'DL',
                'Phi-health',
                'SSS',
                'UMID',
                'POSTAL',
                'Passport',
                'Voters', // Escaped single quote
                'TIN',
                'D1'
            ])->nullable();
            $table->enum('clearance', ['BARANGAY Clearance','NBI Clearance','Police Clearance'])->nullable();
            $table->string('id_number')->nullable();
            $table->boolean('staff_house')->default(false);
            $table->boolean('birth_certificate')->default(false);
            $table->boolean('marriage_certificate')->default(false);
            $table->boolean('tor')->default(false);
            $table->boolean('diploma_hs_college')->default(false);
            $table->enum('contract', ['SIGNED', 'NOT YET', 'REVIEW'])->default('NOT YET');
            $table->boolean('performance_evaluation')->default(false);
            $table->boolean('medical_cert')->default(false);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('employees');
    }
};