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
            'items' => $proposal->items ?? [], 'status' => $proposal->status,
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
            $proposal->items = [];
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
