<?php

namespace Tests\Feature;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AgentTest extends TestCase
{
    use RefreshDatabase;

    private function token(string $peran = 'bd'): string
    {
        Member::create(['nama' => 'ag', 'peran' => $peran, 'password' => Hash::make('pw123456')]);

        return $this->postJson('/api/login', ['nama' => 'ag', 'pw' => 'pw123456'])->json('token');
    }

    private function fakeLangflow(string $text = 'Draft siap.'): void
    {
        config(['bidmaster.langflow_url' => 'http://lf.test', 'bidmaster.langflow_key' => 'k']);
        Http::fake(['*' => Http::response([
            'outputs' => [['outputs' => [['results' => ['message' => ['text' => $text]]]]]],
        ], 200)]);
    }

    public function test_agent_tanpa_konfigurasi_503(): void
    {
        config(['bidmaster.langflow_url' => '', 'bidmaster.langflow_key' => '']);
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => 'halo'], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(503)->assertJsonPath('code', 'LF_NOT_CONFIGURED');
    }

    public function test_agent_pesan_kosong_dan_tanpa_lampiran_ditolak(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => '   '], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(400);
    }

    public function test_agent_lampiran_dokumen_menjadi_konteks(): void
    {
        $this->fakeLangflow('Analisis dokumen.');
        $t = $this->token();
        $f = UploadedFile::fake()->createWithContent('brief.txt', "Butuh web reservasi\nBudget 10jt");
        $r = $this->post('/api/agent', [
            'message' => 'Tinjau ini', 'flow' => 'bidmaster_proposal_generator', 'file' => $f,
        ], ['Authorization' => "Bearer {$t}"]);
        $r->assertOk()->assertJsonPath('lampiran', 'brief.txt');
        Http::assertSent(function ($req) {
            $body = $req->data();

            return str_contains($body['input_value'] ?? '', 'DOKUMEN TERLAMPIR')
                && str_contains($body['input_value'] ?? '', 'Butuh web reservasi')
                && str_contains($body['input_value'] ?? '', 'Tinjau ini');
        });
    }

    public function test_agent_lampiran_tanpa_pesan_tetap_jalan(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $f = UploadedFile::fake()->createWithContent('kak.txt', "Satu baris kebutuhan");
        $this->post('/api/agent', ['file' => $f], ['Authorization' => "Bearer {$t}"])
            ->assertOk()->assertJsonPath('lampiran', 'kak.txt');
    }

    public function test_agent_lampiran_format_salah_ditolak(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $bad = UploadedFile::fake()->createWithContent('x.exe', 'abc');
        $this->post('/api/agent', ['message' => 'halo', 'file' => $bad], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(422)->assertJsonPath('field', 'file');
    }

    public function test_agent_lampiran_terlalu_besar_ditolak(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $big = UploadedFile::fake()->createWithContent('x.txt', str_repeat('a', 210 * 1024));
        $this->post('/api/agent', ['message' => 'halo', 'file' => $big], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(422);
    }

    public function test_agent_flow_tidak_dikenal_ditolak(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => 'halo', 'flow' => 'flow_asing'],
            ['Authorization' => "Bearer {$t}"])->assertStatus(400);
    }

    public function test_agent_mode_proposal_tanpa_tweak(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => 'halo'], ['Authorization' => "Bearer {$t}"])
            ->assertOk()->assertJsonPath('mode', 'proposal');
        Http::assertSent(fn ($req) => ! array_key_exists('tweaks', $req->data()));
    }

    public function test_agent_mode_umum_mengirim_override_prompt(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => 'apa itu cloud computing?', 'mode' => 'umum'],
            ['Authorization' => "Bearer {$t}"])->assertOk()->assertJsonPath('mode', 'umum');
        Http::assertSent(function ($req) {
            $b = $req->data();
            $node = config('bidmaster.langflow_prompt_node');

            return isset($b['tweaks'][$node]['template'])
                && str_contains($b['tweaks'][$node]['template'], 'Pertanyaan umum')
                && str_contains($b['tweaks'][$node]['template'], '{context}')
                && str_contains($b['tweaks'][$node]['template'], '{tender}');
        });
    }

    public function test_agent_saran_file_benar_saat_minta_file(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent', ['message' => 'Buatkan file Word siap unduh dari draft ini'],
            ['Authorization' => "Bearer {$t}"])->assertOk()->assertJsonPath('saran_file', true);
        $this->postJson('/api/agent', ['message' => 'Jelaskan singkat saja'],
            ['Authorization' => "Bearer {$t}"])->assertOk()->assertJsonPath('saran_file', false);
    }

    public function test_agent_file_docx_menghasilkan_unduhan(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $r = $this->postJson('/api/agent/file',
            ['markdown' => "# Judul\n\nIsi **tebal** dan tabel:\n\n| Komponen | Qty |\n|---|---|\n| DEV-BE | 2 |\n\n- satu\n- dua",
                'format' => 'docx', 'nama' => 'Draft Kafe'],
            ['Authorization' => "Bearer {$t}"]);
        $r->assertOk();
        $this->assertStringStartsWith('PK', $r->getContent());
        $this->assertStringContainsString('draft_kafe.docx', (string) $r->headers->get('Content-Disposition'));
        $this->assertDatabaseHas('audits', ['aksi' => 'agent-file']);
    }

    public function test_agent_file_md_menghasilkan_markdown(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $r = $this->postJson('/api/agent/file', ['markdown' => '# Halo Bob', 'format' => 'md', 'nama' => 'catatan'],
            ['Authorization' => "Bearer {$t}"]);
        $r->assertOk();
        $this->assertSame('# Halo Bob', $r->getContent());
        $this->assertStringContainsString('catatan.md', (string) $r->headers->get('Content-Disposition'));
    }

    public function test_agent_file_tolak_isi_kosong_dan_terlalu_besar(): void
    {
        $this->fakeLangflow();
        $t = $this->token();
        $this->postJson('/api/agent/file', ['markdown' => ''], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(422)->assertJsonPath('field', 'markdown');
        $this->postJson('/api/agent/file', ['markdown' => str_repeat('a', 201 * 1024)], ['Authorization' => "Bearer {$t}"])
            ->assertStatus(422);
    }
}
