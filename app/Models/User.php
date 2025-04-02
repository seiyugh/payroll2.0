<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'username',
        'full_name',
        'password_hash',
        'user_type',
        'employee_number',
        'last_login',
        'is_active',
    ];
    
    protected $hidden = [
        'password_hash',
        'remember_token',
    ];

    protected $casts = [
        'password_hash' => 'hashed',
        'is_active' => 'boolean',
        'last_login' => 'datetime',
    ];

    /**
     * Get the password for the user.
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }

    /**
     * Define the one-to-one relationship with the Employee model.
     */
    public function employee()
    {
        return $this->hasOne(Employee::class);
    }
}

