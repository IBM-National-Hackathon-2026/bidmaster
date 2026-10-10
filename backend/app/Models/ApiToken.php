<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiToken extends Model
{
    protected $table = 'api_tokens';

    public $timestamps = false;

    protected $primaryKey = 'token';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['token', 'member_id', 'expires_at'];

    public function member()
    {
        return $this->belongsTo(Member::class, 'member_id');
    }
}
