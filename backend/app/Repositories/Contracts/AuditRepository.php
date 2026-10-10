<?php

namespace App\Repositories\Contracts;

interface AuditRepository
{
    public function log(?int $memberId, string $aksi, string $detail = ''): void;

    /** @return list<array{ts:int,aksi:string,detail:string}> */
    public function history(?int $memberId, int $limit = 50): array;
}
