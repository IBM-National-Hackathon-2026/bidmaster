<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proposal extends Model
{
    protected $fillable = ['member_id', 'instansi', 'jenis_instansi', 'pagu',
        'durasi_minggu', 'req_nama', 'req_teks', 'req_satuan', 'req_jumlah',
        'pendukung', 'items', 'status', 'current_version', 'decisions', 'approvals'];

    protected $casts = ['pagu' => 'integer', 'pendukung' => 'array', 'items' => 'array',
        'decisions' => 'array', 'approvals' => 'array', 'req_units' => 'array'];

    public function versions()
    {
        return $this->hasMany(ProposalVersion::class)->orderBy('versi');
    }
}
