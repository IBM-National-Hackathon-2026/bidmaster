<?php

namespace App\Repositories;

use App\Models\Member;
use App\Repositories\Contracts\MemberRepository;

class EloquentMemberRepository implements MemberRepository
{
    public function findByNama(string $nama): ?Member
    {
        return Member::where('nama', $nama)->first();
    }

    public function create(array $attrs): Member
    {
        return Member::create($attrs);
    }
}
