<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/** Proxy ke Langflow Run API (project Bidmaster_Proposal, 1 flow aktif). */
class LangflowService
{
    public function configured(): bool
    {
        return (bool) config('bidmaster.langflow_url')
            && (bool) config('bidmaster.langflow_key');
    }

    public function flow(): string
    {
        return config('bidmaster.langflow_flow', 'generate_proposal_draft');
    }

    /** @return array{ok:bool,text?:string,error?:string} */
    public function run(string $message, string $flow, string $sessionId = ''): array
    {
        $payload = ['input_value' => $message, 'output_type' => 'chat', 'input_type' => 'chat'];
        if ($sessionId !== '') {
            $payload['session_id'] = $sessionId;
        }
        try {
            $res = Http::timeout(300)
                ->withHeader('x-api-key', config('bidmaster.langflow_key'))
                ->post(rtrim(config('bidmaster.langflow_url'), '/')."/api/v1/run/{$flow}?stream=false", $payload);
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Tidak dapat menghubungi Langflow: '.$e->getMessage()];
        }
        if (! $res->successful()) {
            $detail = $res->json('detail', $res->reason());
            if (is_array($detail)) {
                $detail = json_encode($detail);
            }

            return ['ok' => false, 'error' => "Langflow HTTP {$res->status()}: {$detail}"];
        }
        $text = $this->extract($res->json());
        if ($text === null) {
            return ['ok' => false, 'error' => 'Output Langflow tidak ditemukan.'];
        }

        return ['ok' => true, 'text' => $text];
    }

    private function extract(mixed $data): ?string
    {
        try {
            return $data['outputs'][0]['outputs'][0]['results']['message']['text'];
        } catch (\Throwable) {
        }
        try {
            return $data['outputs'][0]['outputs'][0]['messages'][0]['message'];
        } catch (\Throwable) {
        }

        return null;
    }
}
