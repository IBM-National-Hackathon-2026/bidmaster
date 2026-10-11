<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\AuditRepository;
use App\Services\DocumentParserService;
use App\Services\DocumentService;
use App\Services\DocxExportService;
use App\Services\LangflowService;
use Illuminate\Http\Request;

class AgentController
{
    public function __construct(
        private LangflowService $lf,
        private AuditRepository $audits,
        private DocumentParserService $parser,
    ) {}

    public function status()
    {
        return response()->json([
            'configured' => $this->lf->configured(),
            'flows' => ['bidmaster_proposal_generator'],
            'flow' => $this->lf->flow(),
        ]);
    }

    public function send(Request $request)
    {
        if (! $this->lf->configured()) {
            return response()->json([
                'error' => 'Langflow belum dikonfigurasi. Isi LANGFLOW_URL dan LANGFLOW_API_KEY.',
                'code' => 'LF_NOT_CONFIGURED',
            ], 503);
        }

        $data = $request->isJson() ? $request->json()->all() : $request->all();
        $msg = mb_substr(trim((string) ($data['message'] ?? '')), 0, 4000);

        $lampiran = $this->lampiran($request);
        if ($lampiran['error'] !== null) {
            return response()->json(['error' => $lampiran['error'], 'field' => 'file'], 422);
        }
        if ($msg === '' && $lampiran['nama'] === '') {
            return response()->json(['error' => "Field 'message' atau dokumen tidak boleh kosong."], 400);
        }
        if ($msg === '') {
            $msg = 'Tinjau dokumen terlampir dan berikan analisis serta usulan.';
        }

        $flow = (string) ($data['flow'] ?? 'bidmaster_proposal_generator');
        $allowed = ['bidmaster_proposal_generator', 'generate_proposal_draft', 'revise_proposal', 'generate_prd_from_brief'];
        if (! in_array($flow, $allowed, true)) {
            return response()->json(['error' => "Flow '{$flow}' tidak dikenal."], 400);
        }
        $session = mb_substr((string) ($data['session_id'] ?? ''), 0, 64);

        // Mode "umum": Bob boleh menjawab pertanyaan di luar konteks proposal.
        // Mode "proposal" (default): pakai prompt flow apa adanya (grounded).
        $mode = ($data['mode'] ?? 'proposal') === 'umum' ? 'umum' : 'proposal';

        $payload = $msg;
        if ($lampiran['teks'] !== '') {
            $payload = $msg."\n\n=== DOKUMEN TERLAMPIR: ".$lampiran['nama']." ===\n".$lampiran['teks']
                ."\n=== AKHIR DOKUMEN TERLAMPIR ===";
        }

        $tweaks = $mode === 'umum' ? $this->lf->generalTemplate() : [];
        $result = $this->lf->run($payload, $this->lf->flow(), $session, $tweaks);
        if (! $result['ok'] && $tweaks !== []) {
            // Node prompt mungkin berbeda di instance Langflow pengguna.
            // Fallback: jalankan tanpa override agar tetap ada jawaban.
            $result = $this->lf->run($payload, $this->lf->flow(), $session);
        }
        if (! $result['ok']) {
            return response()->json(['error' => $result['error'], 'code' => 'LF_ERROR'], 502);
        }
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'agent', 'flow='.$flow.' mode='.$mode.' len='.strlen($msg)
            .($lampiran['nama'] !== '' ? " lampiran={$lampiran['nama']}" : ''));

        return response()->json(['text' => $result['text'], 'flow' => $flow, 'mode' => $mode,
            'saran_file' => $this->mintaFile($msg),
            'lampiran' => $lampiran['nama'] !== '' ? $lampiran['nama'] : null]);
    }

    /**
     * Deteksi apakah pengguna meminta file siap unduh.
     * Dipakai UI untuk menonjolkan tombol unduh pada jawaban Bob.
     */
    private function mintaFile(string $msg): bool
    {
        $t = mb_strtolower($msg);

        return (bool) preg_match('/\b(file|unduh|download|docx|word|pdf|ekspor|export|lampiran|siap kirim|siap unduh)\b/u', $t);
    }

    /**
     * Ubah teks jawaban Bob (Markdown) menjadi file siap unduh.
     * Stateless: isi tidak disimpan, hanya dialirkan sekali.
     */
    public function file(Request $request, DocxExportService $docx)
    {
        $data = $request->isJson() ? $request->json()->all() : $request->all();
        $md = (string) ($data['markdown'] ?? '');
        if (strlen($md) < 1 || strlen($md) > 200 * 1024) {
            return response()->json(['error' => 'Isi dokumen 1B-200KB.', 'field' => 'markdown'], 422);
        }
        $format = ($data['format'] ?? 'docx') === 'md' ? 'md' : 'docx';
        $nama = DocumentService::slug((string) ($data['nama'] ?? 'jawaban-bob'));
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'agent-file', $format.' '.strlen($md).' chr');

        if ($format === 'md') {
            return response($md, 200, [
                'Content-Type' => 'text/markdown; charset=UTF-8',
                'Content-Disposition' => "attachment; filename={$nama}.md",
            ]);
        }

        return response($docx->toBytes($md), 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition' => "attachment; filename={$nama}.docx",
        ]);
    }

    /**
     * Parse dokumen terlampir (opsional) menjadi teks untuk konteks agen.
     *
     * @return array{nama:string,teks:string,error:?string}
     */
    private function lampiran(Request $request): array
    {
        $file = $request->file('file');
        if (! $file || ! $file->isValid()) {
            return ['nama' => '', 'teks' => '', 'error' => null];
        }
        try {
            $parsed = $this->parser->parse($file->getClientOriginalName(), file_get_contents($file->getRealPath()));
        } catch (\InvalidArgumentException $e) {
            return ['nama' => '', 'teks' => '', 'error' => $e->getMessage()];
        }
        $teks = implode("\n", array_map(fn ($unit) => $unit['teks'], $parsed['units']));

        return ['nama' => $parsed['nama'], 'teks' => mb_substr($teks, 0, 12000), 'error' => null];
    }
}
