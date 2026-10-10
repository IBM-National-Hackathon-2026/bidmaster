<?php

namespace Tests\Feature\Security;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private function token(string $nama, string $peran): string
    {
        Member::create(['nama' => $nama, 'peran' => $peran, 'password' => Hash::make('pw123456')]);

        return $this->postJson('/api/login', ['nama' => $nama, 'pw' => 'pw123456'])->json('token');
    }

    private function draftBody(): array
    {
        return ['mode' => 'tender', 'nama' => 'Dinas X', 'industri' => 'Pemerintahan',
            'durasi_minggu' => 4, 'diskon_persen' => 0, 'pagu' => 0,
            'dokumen_text' => 'Pengembangan backend API',
            'legal' => ['nib' => '1', 'npwp' => '2', 'akta' => '3'],
            'komponen' => [['kode' => 'DEV-BE', 'qty' => 1]]];
    }

    public function test_viewer_dilarang_draft_export_agent(): void
    {
        $t = $this->token('v1', 'viewer');
        $h = ['Authorization' => "Bearer {$t}"];
        $this->postJson('/api/draft', $this->draftBody(), $h)->assertStatus(403);
        $this->postJson('/api/export', ['format' => 'docx', 'markdown' => '# x'], $h)->assertStatus(403);
        $this->postJson('/api/agent', ['message' => 'halo'], $h)->assertStatus(403);
    }

    public function test_viewer_boleh_baca(): void
    {
        $t = $this->token('v2', 'viewer');
        $h = ['Authorization' => "Bearer {$t}"];
        $this->getJson('/api/catalog')->assertOk();
        $this->getJson('/api/me', $h)->assertOk();
        $this->getJson('/api/audit', $h)->assertOk();
    }

    public function test_bd_boleh_draft(): void
    {
        $t = $this->token('b1', 'bd');
        $this->postJson('/api/draft', $this->draftBody(), ['Authorization' => "Bearer {$t}"])->assertOk();
    }

    public function test_audit_terisolasi_per_non_admin(): void
    {
        $tb = $this->token('bd2', 'bd');
        $this->postJson('/api/draft', $this->draftBody(), ['Authorization' => "Bearer {$tb}"])->assertOk();
        $ta = $this->token('adm', 'admin');
        $this->postJson('/api/draft', $this->draftBody(), ['Authorization' => "Bearer {$ta}"])->assertOk();
        $own = $this->getJson('/api/audit', ['Authorization' => "Bearer {$tb}"])->json('audit');
        $all = $this->getJson('/api/audit', ['Authorization' => "Bearer {$ta}"])->json('audit');
        $this->assertNotEmpty($own);
        $this->assertGreaterThanOrEqual(count($own), count($all));
        foreach ($all as $row) {
            $this->assertArrayHasKey('aksi', $row);
            $this->assertArrayNotHasKey('token', $row);
        }
    }
}
