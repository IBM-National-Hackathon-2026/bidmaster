<?php

namespace App\Http\Controllers;

use App\Models\Proposal;
use App\Repositories\Contracts\AuditRepository;
use App\Services\AnalysisService;
use App\Services\DocumentParserService;
use App\Services\LangflowService;
use Illuminate\Http\Request;

class ProposalsController
{
    public function __construct(
        private AuditRepository $audits,
        private DocumentParserService $parser,
        private AnalysisService $analysis,
        private LangflowService $lf,
    ) {}

    public function company()
    {
        $dir = config('bidmaster.knowledge_dir');
        $file = $dir.'/perusahaan.json';
        $data = is_file($file) ? json_decode(file_get_contents($file), true) : [];
        if (! is_array($data)) {
            $data = [];
        }

        return response()->json([
            'nama_resmi' => $data['nama_resmi'] ?? '',
            'nama_singkat' => $data['nama_singkat'] ?? '',
            'tagline' => $data['tagline'] ?? '',
        ]);
    }

    private function own(Request $request, Proposal $proposal): bool
    {
        $u = $request->attributes->get('member');

        return $u['peran'] === 'admin' || (int) $proposal->member_id === (int) $u['id'];
    }

    public function index(Request $request)
    {
        $u = $request->attributes->get('member');
        $q = Proposal::orderByDesc('updated_at');
        if ($u['peran'] !== 'admin') {
            $q->where('member_id', $u['id']);
        }

        return response()->json(['proposals' => $q->get()
            ->map(fn ($row) => $this->summary($row))->all()]);
    }

    private function summary(Proposal $proposal): array
    {
        return ['id' => $proposal->id, 'instansi' => $proposal->instansi, 'status' => $proposal->status,
            'updated_at' => $proposal->updated_at?->toIso8601String(), 'dibuat_oleh' => $proposal->member_id,
            'current_version' => $proposal->current_version];
    }

    public function show(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }

        return response()->json(['proposal' => $this->full($proposal)]);
    }

    private function full(Proposal $proposal): array
    {
        return ['id' => $proposal->id, 'instansi' => $proposal->instansi, 'jenis_instansi' => $proposal->jenis_instansi,
            'pagu' => $proposal->pagu, 'durasi_minggu' => $proposal->durasi_minggu,
            'req_nama' => $proposal->req_nama, 'req_satuan' => $proposal->req_satuan, 'req_jumlah' => $proposal->req_jumlah,
            'req_teks' => $proposal->req_teks, 'pendukung' => $proposal->pendukung ?? [],
            'req_units' => $proposal->req_units ?? [],
            'items' => $proposal->items ?? [], 'decisions' => $proposal->decisions ?? [],
            'approvals' => $proposal->approvals ?? [], 'status' => $proposal->status,
            'current_version' => $proposal->current_version,
            'updated_at' => $proposal->updated_at?->toIso8601String()];
    }

    public function store(Request $request)
    {
        $u = $request->attributes->get('member');
        $d = $request->isJson() ? $request->json()->all() : [];
        $pagu = $d['pagu'] ?? null;
        if ($pagu !== null && $pagu !== '') {
            $pagu = filter_var($pagu, FILTER_VALIDATE_INT);
            if ($pagu === false || $pagu < 0 || $pagu > 10_000_000_000) {
                return response()->json(['error' => 'Pagu 0-10Miliar.', 'field' => 'pagu'], 400);
            }
        } else {
            $pagu = null;
        }
        $dur = filter_var($d['durasi_minggu'] ?? 12, FILTER_VALIDATE_INT);
        if ($dur === false || $dur < 1 || $dur > 52) {
            return response()->json(['error' => 'Durasi 1-52 minggu.', 'field' => 'durasi'], 400);
        }
        $proposal = Proposal::create(['member_id' => $u['id'],
            'instansi' => mb_substr(trim((string) ($d['instansi'] ?? '')), 0, 80),
            'jenis_instansi' => mb_substr((string) ($d['jenis_instansi'] ?? 'Pemerintahan'), 0, 40),
            'pagu' => $pagu, 'durasi_minggu' => $dur]);
        $this->audits->log($u['id'], 'proposal_buat', "#{$proposal->id} {$proposal->instansi}");

        return response()->json(['proposal' => $this->full($proposal->fresh())], 201);
    }

    public function update(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $u = $request->attributes->get('member');
        $d = $request->isJson() ? $request->json()->all() : [];
        $patch = [];
        if (array_key_exists('instansi', $d)) {
            $patch['instansi'] = mb_substr(trim((string) $d['instansi']), 0, 80);
        }
        if (array_key_exists('jenis_instansi', $d)) {
            $patch['jenis_instansi'] = mb_substr((string) $d['jenis_instansi'], 0, 40);
        }
        if (array_key_exists('pagu', $d)) {
            $pg = $d['pagu'];
            if ($pg === null || $pg === '') {
                $patch['pagu'] = null;
            } else {
                $pg = filter_var($pg, FILTER_VALIDATE_INT);
                if ($pg === false || $pg < 0 || $pg > 10_000_000_000) {
                    return response()->json(['error' => 'Pagu 0-10Miliar.', 'field' => 'pagu'], 400);
                }
                $patch['pagu'] = $pg;
            }
        }
        if (array_key_exists('durasi_minggu', $d)) {
            $dur = filter_var($d['durasi_minggu'], FILTER_VALIDATE_INT);
            if ($dur === false || $dur < 1 || $dur > 52) {
                return response()->json(['error' => 'Durasi 1-52 minggu.', 'field' => 'durasi'], 400);
            }
            $patch['durasi_minggu'] = $dur;
        }
        if ($patch !== []) {
            $proposal->fill($patch)->save();
            $this->audits->log($u['id'], 'proposal_ubah', "#{$proposal->id} ".implode(',', array_keys($patch)));
        }

        return response()->json(['proposal' => $this->full($proposal->fresh()),
            'tersimpan_pukul' => date('H.i')]);
    }

    public function destroy(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'proposal_hapus', "#{$proposal->id} {$proposal->instansi}");
        $proposal->delete();

        return response()->json(['ok' => true]);
    }

    public function upload(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $kind = $request->input('kind', 'requirement');
        if (! in_array($kind, ['requirement', 'pendukung'], true)) {
            return response()->json(['error' => 'Jenis harus requirement/pendukung.'], 400);
        }
        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return response()->json(['error' => 'File tidak valid.', 'field' => 'file'], 400);
        }
        try {
            $parsed = $this->parser->parse($file->getClientOriginalName(), file_get_contents($file->getRealPath()));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage(), 'field' => 'file'], 422);
        }
        if ($kind === 'requirement') {
            $proposal->req_nama = $parsed['nama'];
            $proposal->req_teks = implode("\n", array_map(fn ($unit) => $unit['teks'], $parsed['units']));
            $proposal->req_satuan = $parsed['satuan'];
            $proposal->req_jumlah = $parsed['jumlah'];
            $proposal->req_units = array_map(fn ($unit) => [
                'label' => $unit['label'], 'teks' => $unit['teks'],
                'halaman' => $unit['halaman'] ?? null, 'paragraf' => $unit['paragraf'] ?? null,
            ], $parsed['units']);
            $proposal->items = [];
            $proposal->decisions = [];
            $proposal->approvals = [];
            $proposal->status = 'draf';
        } else {
            $pend = $proposal->pendukung ?? [];
            $pend[] = ['nama' => $parsed['nama'], 'satuan' => $parsed['satuan'],
                'jumlah' => $parsed['jumlah'], 'units' => $parsed['units']];
            $proposal->pendukung = array_slice($pend, -5);
        }
        $proposal->save();
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'proposal_ubah', "#{$proposal->id} upload {$kind} {$parsed['nama']}");

        return response()->json(['proposal' => $this->full($proposal->fresh()),
            'file' => ['nama' => $parsed['nama'], 'satuan' => $parsed['satuan'],
                'jumlah' => $parsed['jumlah'], 'status' => 'berhasil dibaca']]);
    }

    public function quotes(Request $request)
    {
        $codes = [];
        foreach (explode(',', (string) $request->query('codes', '')) as $c) {
            $c = strtoupper(trim($c));
            if (preg_match('/^K\d{2}$/', $c)) {
                $codes[] = $c;
            }
        }
        $codes = array_values(array_unique(array_slice($codes, 0, 10)));
        $dir = config('bidmaster.knowledge_dir');
        $map = [];
        $file = $dir.'/knowledge_perusahaan.md';
        if (is_file($file)) {
            foreach (explode("\n", file_get_contents($file)) as $line) {
                if (preg_match('/^(K\d{2})\s*\|\s*(.+)$/', trim($line), $m)) {
                    $map[$m[1]] = trim($m[2]);
                }
            }
        }
        $out = [];
        foreach ($codes as $c) {
            if (isset($map[$c])) {
                $out[] = ['kode' => $c, 'teks' => $map[$c]];
            }
        }

        return response()->json(['quotes' => $out]);
    }

    public function source(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $units = $proposal->req_units ?? [];
        if ($units === []) {
            foreach (preg_split('/\R/', $proposal->req_teks) as $i => $line) {
                $line = trim($line);
                if ($line !== '') {
                    $units[] = ['label' => 'baris '.($i + 1), 'teks' => $line];
                }
            }
        }
        $baris = $request->query('baris');
        $halaman = $request->query('halaman');
        $paragraf = $request->query('paragraf');
        $kutipan = mb_substr(trim((string) $request->query('kutipan', '')), 0, 500);
        $idx = null;
        $label = '';
        foreach ($units as $i => $u) {
            if ($baris !== null && ($u['label'] ?? '') === 'baris '.(int) $baris) {
                $idx = $i;
                $label = $u['label'];
                break;
            }
            if ($halaman !== null && ($u['halaman'] ?? null) == (int) $halaman
                && ($u['paragraf'] ?? null) == (int) $paragraf) {
                $idx = $i;
                $label = $u['label'];
                break;
            }
        }
        if ($idx === null) {
            return response()->json(['error' => 'Sumber tidak ditemukan di dokumen.'], 404);
        }
        $pick = fn ($i) => isset($units[$i]) ? ['label' => $units[$i]['label'], 'teks' => $units[$i]['teks']] : null;

        return response()->json(['label' => $label,
            'target' => $units[$idx]['teks'], 'kutipan' => $kutipan,
            'atas' => array_values(array_filter([$pick($idx - 2), $pick($idx - 1)])),
            'bawah' => array_values(array_filter([$pick($idx + 1), $pick($idx + 2)]))]);
    }

    public function decide(Request $request, Proposal $proposal, string $item)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $u = $request->attributes->get('member');
        $d = $request->isJson() ? $request->json()->all() : [];
        $putusan = $d['putusan'] ?? '';
        if (! in_array($putusan, ['benar', 'ubah', 'tanya'], true)) {
            return response()->json(['error' => 'Putusan harus benar/ubah/tanya.', 'field' => 'putusan'], 400);
        }
        $items = $proposal->items ?? [];
        $found = null;
        foreach ($items as $it) {
            if (($it['id'] ?? '') === $item) {
                $found = $it;
                break;
            }
        }
        if (! $found) {
            return response()->json(['error' => 'Butir tidak ditemukan.'], 404);
        }
        $alasan = mb_substr(trim((string) ($d['alasan'] ?? '')), 0, 300);
        if ($putusan === 'ubah') {
            $status = $d['status'] ?? '';
            if (! in_array($status, ['sesuai', 'sebagian', 'berisiko'], true)) {
                return response()->json(['error' => 'Status harus Sesuai/Sebagian/Berisiko.', 'field' => 'status'], 400);
            }
            if ($alasan === '') {
                return response()->json(['error' => 'Alasan wajib diisi saat mengubah status.', 'field' => 'alasan'], 400);
            }
        } else {
            $status = $found['status'];
        }
        $decisions = $proposal->decisions ?? [];
        $decisions[$item] = ['putusan' => $putusan, 'status_awal' => $found['status'],
            'status_akhir' => $putusan === 'tanya' ? $found['status'] : $status,
            'alasan' => $alasan,
            'catatan' => mb_substr(trim((string) ($d['catatan'] ?? '')), 0, 500),
            'pertanyaan' => $putusan === 'tanya' ? mb_substr(trim((string) ($d['pertanyaan'] ?? $alasan)), 0, 300) : '',
            'oleh' => $u['nama'], 'pada' => date('c')];
        $proposal->decisions = $decisions;
        $proposal->approvals = [];
        $proposal->save();
        $this->audits->log($u['id'], 'keputusan',
            "#{$proposal->id} {$item}: {$found['status']} → {$decisions[$item]['status_akhir']} ({$putusan}) {$alasan}");

        return response()->json(['proposal' => $this->full($proposal->fresh())]);
    }

    public function approveSesuai(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        $u = $request->attributes->get('member');
        $d = $request->isJson() ? $request->json()->all() : [];
        if (($d['konfirmasi'] ?? false) !== true) {
            return response()->json(['error' => 'Konfirmasi wajib dicentang.', 'field' => 'konfirmasi'], 400);
        }
        $items = $proposal->items ?? [];
        $decisions = $proposal->decisions ?? [];
        $n = 0;
        foreach ($items as $it) {
            $id = $it['id'] ?? '';
            if ($id === '' || isset($decisions[$id])) {
                continue;
            }
            if ($it['status'] === 'sesuai' && $it['keyakinan'] === 'tinggi' && ! $it['perlu_konfirmasi']) {
                $decisions[$id] = ['putusan' => 'benar', 'status_awal' => 'sesuai',
                    'status_akhir' => 'sesuai', 'alasan' => 'Disetujui massal (Sesuai, keyakinan Tinggi).',
                    'catatan' => '', 'pertanyaan' => '', 'oleh' => $u['nama'], 'pada' => date('c'),
                    'massal' => true];
                $n++;
            }
        }
        if ($n === 0) {
            return response()->json(['error' => 'Tidak ada butir yang memenuhi syarat.'], 400);
        }
        $proposal->decisions = $decisions;
        $proposal->approvals = [];
        $proposal->save();
        $this->audits->log($u['id'], 'keputusan_massal', "#{$proposal->id} {$n} butir Sesuai-Tinggi disetujui");

        return response()->json(['proposal' => $this->full($proposal->fresh()), 'disetujui' => $n]);
    }

    public function analyze(Request $request, Proposal $proposal)
    {
        if (! $this->own($request, $proposal)) {
            return response()->json(['error' => 'Akses ditolak untuk peran ini.'], 403);
        }
        set_time_limit(300);
        if (trim($proposal->req_teks) === '') {
            return response()->json(['error' => 'Unggah dokumen requirement dulu.', 'field' => 'file'], 400);
        }
        if (! $this->lf->configured()) {
            return response()->json(['error' => 'Mesin analisis belum dikonfigurasi.', 'code' => 'LF_NOT_CONFIGURED'], 503);
        }
        $started = microtime(true);
        $result = $this->lf->run($this->analysis->prompt($proposal), $this->lf->flow(),
            'proposal-'.$proposal->id, $this->analysis->templateOverride());
        if (! $result['ok']) {
            return response()->json(['error' => $result['error'], 'code' => 'LF_ERROR'], 502);
        }
        $raw = AnalysisService::extractJson($result['text']);
        if ($raw === null) {
            return response()->json(['error' => 'Respons mesin tidak terstruktur. Coba lagi.', 'code' => 'LF_FORMAT'], 502);
        }
        $checked = $this->analysis->validateItems($proposal, $raw);
        $proposal->items = $checked['items'];
        $proposal->status = 'dianalisis';
        $proposal->save();
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'proposal_analisis',
            "#{$proposal->id} {$checked['valid']} valid, {$checked['invalid']} perlu konfirmasi, ".round(microtime(true) - $started).' dtk');

        return response()->json(['proposal' => $this->full($proposal->fresh()),
            'ringkasan' => ['butir' => count($checked['items']), 'valid' => $checked['valid'],
                'perlu_konfirmasi' => $checked['invalid'],
                'waktu_detik' => (int) round(microtime(true) - $started)]]);
    }
}
