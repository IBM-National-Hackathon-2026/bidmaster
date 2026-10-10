<?php

namespace App\Gates;

use App\Gates\Contracts\GateCheck;

class PaguCheck implements GateCheck
{
    public function check(array $ctx): ?string
    {
        $total = $ctx['total'] ?? 0;
        $pagu = $ctx['pagu'] ?? 0;
        if ($pagu && $total > $pagu) {
            return 'Total Rp '.number_format($total, 0, ',', '.')
                .' melebihi pagu Rp '.number_format($pagu, 0, ',', '.')
                .' — turunkan qty/komponen.';
        }

        return null;
    }
}
