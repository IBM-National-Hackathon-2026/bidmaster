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
}
