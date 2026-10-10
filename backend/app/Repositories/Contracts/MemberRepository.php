<?php

namespace App\Repositories\Contracts;

use App\Models\Member;

interface MemberRepository
{
    public function findByNama(string $nama): ?Member;

    public function create(array $attrs): Member;
}
