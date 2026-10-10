<?php

namespace App\Gates\Contracts;

/** Satu pemeriksaan gate. Kembalikan null bila lolos, atau pesan blokir. */
interface GateCheck
{
    public function check(array $ctx): ?string;
}
