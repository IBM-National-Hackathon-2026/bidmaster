<?php

namespace App\Http\Controllers;

use App\Repositories\Contracts\AuditRepository;
use App\Services\LangflowService;
use Illuminate\Http\Request;

class AgentController
{
    public function __construct(private LangflowService $lf, private AuditRepository $audits) {}

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
        $data = $request->isJson() ? $request->json()->all() : [];
        $msg = mb_substr(trim((string) ($data['message'] ?? '')), 0, 4000);
        if ($msg === '') {
            return response()->json(['error' => "Field 'message' tidak boleh kosong."], 400);
        }
        $flow = (string) ($data['flow'] ?? 'bidmaster_proposal_generator');
        $allowed = ['bidmaster_proposal_generator', 'generate_proposal_draft', 'revise_proposal', 'generate_prd_from_brief'];
        if (! in_array($flow, $allowed, true)) {
            return response()->json(['error' => "Flow '{$flow}' tidak dikenal."], 400);
        }
        $session = mb_substr((string) ($data['session_id'] ?? ''), 0, 64);
        $result = $this->lf->run($msg, $this->lf->flow(), $session);
        if (! $result['ok']) {
            return response()->json(['error' => $result['error'], 'code' => 'LF_ERROR'], 502);
        }
        $u = $request->attributes->get('member');
        $this->audits->log($u['id'], 'agent', 'flow='.$flow.' len='.strlen($msg));

        return response()->json(['text' => $result['text'], 'flow' => $flow]);
    }
}
