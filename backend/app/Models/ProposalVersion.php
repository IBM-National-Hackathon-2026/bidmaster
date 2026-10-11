<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProposalVersion extends Model
{
    protected $fillable = ['proposal_id', 'versi', 'snapshot'];

    protected $casts = ['snapshot' => 'array'];
}
