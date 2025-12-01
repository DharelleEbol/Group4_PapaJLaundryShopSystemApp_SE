<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'branch_name',
        'username',
        'password', // hashed
    ];

    // Hide password when serializing (so API responses don't leak it)
    protected $hidden = [
        'password',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
