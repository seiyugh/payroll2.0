<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('full_name');
            $table->string('password_hash');
            $table->string('user_type');
            $table->string('employee_number')->nullable();
            $table->timestamp('last_login')->nullable();
            $table->boolean('is_active')->default(1);
            $table->timestamps();

            $table->foreign('employee_number')->references('employee_number')->on('employees')->onDelete('cascade');
        });
    }

    public function down(): void {
        Schema::dropIfExists('users');
    }
};