<?php

namespace Tests\Feature\Security;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_dibatasi_10_per_menit(): void
    {
        Member::create(['nama' => 'brute', 'peran' => 'bd', 'password' => Hash::make('benar123')]);
        $hit429 = false;
        for ($i = 0; $i < 12; $i++) {
            $r = $this->postJson('/api/login', ['nama' => 'brute', 'pw' => 'salah']);
            if ($r->getStatusCode() === 429) {
                $hit429 = true;
                break;
            }
        }
        $this->assertTrue($hit429, 'Login harus 429 setelah 10x/menit');
    }

    public function test_draft_dibatasi_30_per_menit(): void
    {
        Member::create(['nama' => 'spam', 'peran' => 'bd', 'password' => Hash::make('pw123456')]);
        $t = $this->postJson('/api/login', ['nama' => 'spam', 'pw' => 'pw123456'])->json('token');
        $h = ['Authorization' => "Bearer {$t}"];
        $b = ['mode' => 'tender', 'nama' => 'Dinas X', 'industri' => 'Pemerintahan',
            'durasi_minggu' => 4, 'diskon_persen' => 0, 'pagu' => 0, 'dokumen_text' => '',
            'legal' => ['nib' => '1', 'npwp' => '2', 'akta' => '3'],
            'komponen' => [['kode' => 'QA', 'qty' => 1]]];
        $hit429 = false;
        for ($i = 0; $i < 35; $i++) {
            $r = $this->postJson('/api/draft', $b, $h);
            if ($r->getStatusCode() === 429) {
                $hit429 = true;
                break;
            }
            $this->assertSame(200, $r->getStatusCode());
        }
        $this->assertTrue($hit429, 'Draft harus 429 setelah 30x/menit');
    }
}
