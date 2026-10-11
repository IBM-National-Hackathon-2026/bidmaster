<?php

namespace Tests\Feature;

use App\Models\Member;
use App\Models\Proposal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ExportTest extends TestCase
{
    use RefreshDatabase;

    private function boot(array $over = []): array
    {
        Member::create(['nama' => 'ex', 'peran' => 'bd', 'password' => Hash::make('pw123456')]);
        Member::create(['nama' => 'ad', 'peran' => 'admin', 'password' => Hash::make('pw123456')]);
        $t = $this->postJson('/api/login', ['nama' => 'ex', 'pw' => 'pw123456'])->json('token');
        $a = $this->postJson('/api/login', ['nama' => 'ad', 'pw' => 'pw123456'])->json('token');
        $h = ['Authorization' => "Bearer {$t}"];
        $p = $this->postJson('/api/proposals', array_merge(['instansi' => 'Dinas Ekspor'], $over), $h)->json('proposal');
        Proposal::where('id', $p['id'])->update([
            'items' => json_encode([['id' => 'B1', 'kategori' => 'T', 'requirement' => 'Backend API',
                'kutipan' => 'backend', 'sumber_klien' => ['baris' => 1], 'sumber_knowledge' => ['K11'],
                'status' => 'sesuai', 'alasan' => '', 'keyakinan' => 'tinggi',
                'komponen_usulan' => [['kode' => 'DEV-BE', 'qty' => 2]]]]),
            'decisions' => json_encode(['B1' => ['putusan' => 'benar', 'status_awal' => 'sesuai',
                'status_akhir' => 'sesuai', 'alasan' => '', 'catatan' => 'cek internal',
                'pertanyaan' => '', 'oleh' => 'ex', 'pada' => date('c')]]),
            'prices' => json_encode([['kode' => 'DEV-BE', 'nama' => 'Pengembangan backend/API',
                'satuan' => 'orang-hari', 'qty' => 2, 'harga_acuan' => 1100000,
                'harga_proposal' => 1100000, 'alasan' => '', 'alasan_catatan' => 'rahasia internal']]),
            'discount' => json_encode(['tipe' => 'persen', 'nilai' => 0, 'alasan' => '']),
        ]);

        return [$p['id'], $h, ['Authorization' => "Bearer {$a}"]];
    }

    public function test_gate_menolak_dan_menjawab_syarat(): void
    {
        [$id, $h] = $this->boot();
        Proposal::where('id', $id)->update(['decisions' => json_encode([]),
            'items' => json_encode([['id' => 'B9', 'kategori' => 'K', 'requirement' => 'ISO',
                'kutipan' => 'iso', 'sumber_klien' => ['baris' => 9], 'sumber_knowledge' => [],
                'status' => 'berisiko', 'alasan' => '', 'keyakinan' => 'rendah',
                'komponen_usulan' => [], 'perlu_konfirmasi' => false]])]);
        $r = $this->getJson("/api/proposals/{$id}/download-check", $h)->assertOk();
        $this->assertFalse($r->json('ok'));
        $this->assertStringContainsString('Berisiko', $r->json('kurang')[0]);
        $this->postJson("/api/proposals/{$id}/export", ['format' => 'docx'], $h)->assertStatus(422);
    }

    public function test_export_docx_struktur_dan_nama(): void
    {
        [$id, $h] = $this->boot();
        $r = $this->postJson("/api/proposals/{$id}/export",
            ['format' => 'docx', 'lampiran_sumber' => true, 'lampiran_klarifikasi' => true], $h);
        $r->assertOk();
        $this->assertStringStartsWith('PK', $r->getContent());
        $cd = $r->headers->get('Content-Disposition');
        $this->assertMatchesRegularExpression('/Proposal_dinas_ekspor_\d{8}\.docx/', $cd);
        $this->assertDatabaseHas('audits', ['aksi' => 'export']);
        $this->assertSame(1, Proposal::find($id)->current_version);
        // unduh ulang versi lama tetap bisa
        $this->getJson("/api/proposals/{$id}/versions", $h)->assertOk()
            ->assertJsonPath('versions.0.versi', 1);
        $v = $this->getJson("/api/proposals/{$id}/versions/1/file?format=md", $h);
        $v->assertOk();
        $this->assertStringContainsString('RAHASIA', $v->getContent());
    }

    public function test_dokumen_tanpa_data_internal(): void
    {
        [$id, $h] = $this->boot();
        // buat versi dulu
        $this->postJson("/api/proposals/{$id}/export", ['format' => 'md'], $h)->assertOk();
        $v = $this->getJson("/api/proposals/{$id}/versions/1/file?format=md", $h);
        $v->assertOk();
        $md = $v->getContent();
        $this->assertStringContainsString('Disiapkan untuk', $md);
        $this->assertStringContainsString('Pengesahan', $md);
        $this->assertStringContainsString('NusaTech', $md);
        $this->assertStringNotContainsString('Harga acuan', $md);
        $this->assertStringNotContainsString('rahasia internal', $md);
        $badan = explode('## Matriks', $md)[0];
        $this->assertStringNotContainsString('Klien baris', $badan);
    }

    public function test_pagu_dan_approval_memblokir_unduh(): void
    {
        [$id, $h] = $this->boot();
        Proposal::where('id', $id)->update(['pagu' => 1000]);
        $r = $this->getJson("/api/proposals/{$id}/download-check", $h)->assertOk();
        $this->assertFalse($r->json('ok'));
        $this->assertStringContainsString('pagu', strtolower(implode(' ', $r->json('kurang'))));
    }
}
