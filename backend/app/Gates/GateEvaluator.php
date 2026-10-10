<?php

namespace App\Gates;

use App\Gates\Contracts\GateCheck;

/** Evaluator Strategy: jalankan semua GateCheck, kumpulkan blokir. */
class GateEvaluator
{
    /** @param list<GateCheck> $checks */
    public function __construct(private array $checks = [])
    {
        if ($checks === []) {
            $this->checks = [new PaguCheck, new KakCoverageCheck, new LegalitasCheck];
        }
    }

    /** @return array{passed:bool,blocks:list<string>} */
    public function evaluate(array $ctx): array
    {
        $blocks = [];
        foreach ($this->checks as $check) {
            $msg = $check->check($ctx);
            if ($msg !== null) {
                $blocks[] = $msg;
            }
        }

        return ['passed' => $blocks === [], 'blocks' => $blocks];
    }
}
