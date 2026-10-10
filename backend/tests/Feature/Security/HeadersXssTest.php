<?php

namespace Tests\Feature\Security;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class HeadersXssTest extends TestCase
{
    use RefreshDatabase;

    public function test_header_keamanan_ada_tanpa_unsafe_inline(): void
    {
        $r = $this->get('/api/health');
        $r->assertOk();
        $csp = $r->headers->get('Content-Security-Policy', '');
        $this->assertStringContainsString("default-src 'self'", $csp);
        $this->assertStringNotContainsString('unsafe-inline', $csp);
        $this->assertSame('nosniff', $r->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $r->headers->get('X-Frame-Options'));
        $this->assertSame('no-referrer', $r->headers->get('Referrer-Policy'));
        $this->assertStringContainsString('no-store', $r->headers->get('Cache-Control', ''));
    }

    public function test_payload_xss_disimpan_sebagai_teks_bukan_html(): void
    {
        Member::create(['nama' => 'xss', 'peran' => 'bd', 'password' => Hash::make('pw123456')]);
        $t = $this->postJson('/api/login', ['nama' => 'xss', 'pw' => 'pw123456'])->json('token');
        $xss = '<script>alert(1)</script><img src=x onerror=alert(2)>';
        $r = $this->postJson('/api/draft', [
            'mode' => 'tender', 'nama' => 'Dinas X', 'industri' => 'Pemerintahan',
            'durasi_minggu' => 4, 'diskon_persen' => 0, 'pagu' => 0,
            'dokumen_text' => $xss, 'catatan' => $xss,
            'legal' => ['nib' => '1', 'npwp' => '2', 'akta' => '3'],
            'komponen' => [['kode' => 'QA', 'qty' => 1]],
        ], ['Authorization' => "Bearer {$t}"]);
        $r->assertOk()->assertHeader('Content-Type', 'application/json');
        $this->assertStringContainsString($xss, $r->json('markdown'));
    }

    public function test_respons_tidak_bocorkan_secret(): void
    {
        Member::create(['nama' => 's1', 'peran' => 'bd', 'password' => Hash::make('pw123456')]);
        $t = $this->postJson('/api/login', ['nama' => 's1', 'pw' => 'pw123456'])->json('token');
        $h = ['Authorization' => "Bearer {$t}"];
        $bodies = [
            $this->getJson('/api/catalog')->getContent(),
            $this->getJson('/api/me', $h)->getContent(),
            $this->getJson('/api/agent/status', $h)->getContent(),
        ];
        foreach ($bodies as $body) {
            foreach ([config('bidmaster.langflow_key'), config('bidmaster.seed_admin_pass')] as $secret) {
                if ($secret !== '') {
                    $this->assertStringNotContainsString($secret, $body);
                }
            }
        }
        $this->assertStringNotContainsString('APP_KEY=', implode('', $bodies));
    }
}
