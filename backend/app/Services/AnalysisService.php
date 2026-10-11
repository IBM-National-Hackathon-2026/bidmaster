<?php

namespace App\Services;

use App\Models\Proposal;

/**
 * Analisis requirement via Langflow + validasi sumber klien.
 * Knowledge perusahaan (K01-K18) sudah ada di KB Langflow; backend
 * TIDAK menerima teks knowledge — hanya kode butir (read-only).
 */
class AnalysisService
{
    public function __construct(private LangflowService $lf) {}

    public function prompt(Proposal $p): string
    {
        $units = [];
        $teks = $p->req_teks;
        if ($p->req_satuan === 'baris') {
            foreach (preg_split('/\R/', $teks) as $i => $line) {
                $line = trim($line);
                if ($line !== '') {
                    $units[] = '[baris '.($i + 1).'] '.$line;
                }
            }
        } else {
            $units[] = $teks;
        }

        return implode("\n", $units);
    }

    /** Override template Prompt node agar flow mengembalikan JSON terstruktur. */
    public function templateOverride(): array
    {
        $node = config('bidmaster.langflow_prompt_node', 'Prompt Template-KZctx');
        // Kurung kurawal JSON digandakan: node Prompt memakai format f-string,
        // hanya {context} dan {tender} yang boleh tunggal.
        $template = <<<'TPL'
        Kamu analis pre-sales. Tugasmu HANYA menganalisis, bukan menulis proposal.
        Balas HANYA dengan array JSON valid (tanpa teks lain, tanpa pagar kode),
        satu objek per kebutuhan:
        [{{"id":"B1","kategori":"...","requirement":"...","kutipan":"...(salin persis dari requirement)",
        "sumber_klien":{{"baris":9}},"sumber_knowledge":["K01"],
        "status":"sesuai|sebagian|berisiko","alasan":"satu kalimat",
        "keyakinan":"tinggi|sedang|rendah","komponen_usulan":[{{"kode":"...","qty":1}}]}}]
        Untuk PDF/DOCX, sumber_klien berbentuk {{"halaman":1,"paragraf":2}}.
        Aturan: cocokkan tiap kebutuhan ke KONTEKS PERUSAHAAN (kode K) di bawah.
        Bila ragu, status "berisiko" + keyakinan "rendah". Jangan mengarang harga.
        Kode komponen valid: DEV-FE, DEV-BE, UIUX, ANALYST, QA, DEPLOY, TRAIN, MAINT.

        KONTEKS PERUSAHAAN:
        {context}

        REQUIREMENT KLIEN:
        {tender}
        TPL;

        return [$node => ['template' => $template]];
    }

    /**
     * Validasi butir AI terhadap dokumen tersimpan.
     * @return array{items:list<array>,valid:int,invalid:int}
     */
    public function validateItems(Proposal $p, array $raw): array
    {
        $units = $this->units($p);
        $items = [];
        $valid = 0;
        foreach (array_slice($raw, 0, 60) as $i => $b) {
            if (! is_array($b)) {
                continue;
            }
            $it = [
                'id' => (string) ($b['id'] ?? 'B'.($i + 1)),
                'kategori' => mb_substr((string) ($b['kategori'] ?? 'Umum'), 0, 60),
                'requirement' => mb_substr((string) ($b['requirement'] ?? ''), 0, 500),
                'kutipan' => mb_substr((string) ($b['kutipan'] ?? ''), 0, 500),
                'sumber_klien' => $b['sumber_klien'] ?? null,
                'sumber_knowledge' => array_values(array_filter(
                    array_map(fn ($k) => preg_match('/^K\d{2}$/', (string) $k) ? (string) $k : null,
                        (array) ($b['sumber_knowledge'] ?? [])))),
                'status' => in_array($b['status'] ?? '', ['sesuai', 'sebagian', 'berisiko'], true)
                    ? $b['status'] : 'berisiko',
                'alasan' => mb_substr((string) ($b['alasan'] ?? ''), 0, 300),
                'keyakinan' => in_array($b['keyakinan'] ?? '', ['tinggi', 'sedang', 'rendah'], true)
                    ? $b['keyakinan'] : 'rendah',
                'komponen_usulan' => $this->cleanKomponen((array) ($b['komponen_usulan'] ?? [])),
                'perlu_konfirmasi' => false,
            ];
            if ($this->sourceValid($units, $it)) {
                $valid++;
            } else {
                $it['perlu_konfirmasi'] = true;
            }
            $items[] = $it;
        }

        return ['items' => $items, 'valid' => $valid, 'invalid' => count($items) - $valid];
    }

    /** @return array<string,string> label => teks ternormalisasi */
    private function units(Proposal $p): array
    {
        $out = [];
        foreach (preg_split('/\R/', $p->req_teks) as $i => $line) {
            $line = trim($line);
            if ($line !== '') {
                $out['baris '.($i + 1)] = $this->norm($line);
            }
        }

        return $out;
    }

    private function norm(string $s): string
    {
        return trim(preg_replace('/\s+/', ' ', mb_strtolower($s)));
    }

    private function sourceValid(array $units, array $it): bool
    {
        $src = $it['sumber_klien'];
        if (! is_array($src)) {
            return false;
        }
        $label = null;
        if (isset($src['baris'])) {
            $label = 'baris '.(int) $src['baris'];
        } elseif (isset($src['halaman'], $src['paragraf'])) {
            $label = 'hal. '.(int) $src['halaman'].', par. '.(int) $src['paragraf'];
        }
        if ($label === null || ! isset($units[$label])) {
            return false;
        }
        $kutip = $this->norm($it['kutipan']);
        if ($kutip === '') {
            return false;
        }

        return str_contains($units[$label], $kutip) || str_contains($kutip, $units[$label]);
    }

    private function cleanKomponen(array $rows): array
    {
        $valid = ['DEV-FE', 'DEV-BE', 'UIUX', 'ANALYST', 'QA', 'DEPLOY', 'TRAIN', 'MAINT'];
        $out = [];
        foreach ($rows as $r) {
            if (! is_array($r) || ! in_array($r['kode'] ?? '', $valid, true)) {
                continue;
            }
            $qty = filter_var($r['qty'] ?? 0, FILTER_VALIDATE_INT);
            if ($qty === false || $qty < 1 || $qty > 1000) {
                continue;
            }
            $out[] = ['kode' => $r['kode'], 'qty' => $qty];
            if (count($out) >= 10) {
                break;
            }
        }

        return $out;
    }

    /** Ambil array JSON dari teks LLM (toleran pagar kode). */
    public static function extractJson(string $text): ?array
    {
        if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $text, $m)) {
            $text = $m[1];
        }
        $start = strpos($text, '[');
        $end = strrpos($text, ']');
        if ($start === false || $end === false || $end <= $start) {
            return null;
        }
        $data = json_decode(substr($text, $start, $end - $start + 1), true);

        return is_array($data) ? array_values($data) : null;
    }
}
