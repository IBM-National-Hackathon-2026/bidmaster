<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\AuditRepository;
use App\Services\DocumentParserService;
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

        $payload = $msg;
        if ($lampiran['teks'] !== '') {
            $payload = $msg."\n\n=== DOKUMEN TERLAMPIR: ".$lampiran['nama']." ===\n".$lampiran['teks']
                ."\n=== AKHIR DOKUMEN TERLAMPIR ===";
        }

        $result = $this->lf->run($payload, $this->lf->flow(), $session);
        if (! $result['ok']) {
            return response()->json(['error' => $result['error'], 'code' => 'LF_ERROR'], 502);
        }
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'agent', 'flow='.$flow.' len='.strlen($msg)
            .($lampiran['nama'] !== '' ? " lampiran={$lampiran['nama']}" : ''));

        return response()->json(['text' => $result['text'], 'flow' => $flow,
            'lampiran' => $lampiran['nama'] !== '' ? $lampiran['nama'] : null]);
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
