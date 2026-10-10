<?php

namespace App\Repositories\Contracts;

interface TokenRepository
{
    /** @return array{token:string,member_id:int,expires_at:int} */
    public function create(int $memberId, int $ttlSeconds): array;

    public function findValid(string $token): ?array;

    public function revoke(string $token): void;
}
