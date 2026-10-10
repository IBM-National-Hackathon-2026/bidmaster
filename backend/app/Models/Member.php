<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    protected $table = 'members';

    public $timestamps = false;

    protected $fillable = ['nama', 'peran', 'password'];

    protected $hidden = ['password'];

    public const ROLES = ['admin', 'bd', 'reviewer', 'viewer'];

    public function tokens()
    {
        return $this->hasMany(ApiToken::class, 'member_id');
    }
}
