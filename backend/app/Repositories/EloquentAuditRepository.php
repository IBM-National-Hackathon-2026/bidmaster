<?php

namespace App\Repositories;

use App\Models\Audit;
use App\Repositories\Contracts\AuditRepository;

class EloquentAuditRepository implements AuditRepository
{
    public function log(?int $memberId, string $aksi, string $detail = ''): void
    {
        Audit::create([
            'ts' => time(),
            'member_id' => $memberId,
            'aksi' => $aksi,
            'detail' => mb_substr($detail, 0, 500),
        ]);
    }

    public function history(?int $memberId, int $limit = 50): array
    {
        $q = Audit::orderByDesc('ts')->limit($limit);
        if ($memberId !== null) {
            $q->where('member_id', $memberId);
        }

        return $q->get(['ts', 'aksi', 'detail'])
            ->map(fn ($r) => ['ts' => $r->ts, 'aksi' => $r->aksi, 'detail' => $r->detail])
            ->all();
    }
}
