<?php

namespace App\Gates;

class KakHelper
{
    private const STOP = ['dan', 'atau', 'yang', 'untuk', 'dengan', 'serta', 'dari', 'pada', 'agar', 'dapat', 'sistem'];

    /** @return list<string> */
    public static function items(?string $dok): array
    {
        $out = [];
        foreach (preg_split('/[\n;]+/', $dok ?? '') as $chunk) {
            foreach (explode(',', $chunk) as $part) {
                $p = trim($part, " -\u{2022}\t.");
                if (mb_strlen($p) >= 8) {
                    $out[] = mb_substr($p, 0, 200);
                }
                if (count($out) >= 30) {
                    break 2;
                }
            }
        }

        return $out;
    }

    /** @return array{rows:list<array{kebutuhan:string,cocok:bool,kata:list<string>}>,uncovered:list<string>} */
    public static function coverage(array $items, array $komponen): array
    {
        $hay = mb_strtolower(implode(' ', array_map(
            fn ($k) => $k['kode'].' '.$k['nama'], $komponen)));
        $rows = [];
        $uncovered = [];
        foreach ($items as $it) {
            preg_match_all('/[a-z]{4,}/', mb_strtolower($it), $m);
            $words = array_values(array_diff($m[0], self::STOP));
            $hit = array_values(array_filter($words, fn ($w) => str_contains($hay, $w)));
            $rows[] = ['kebutuhan' => $it, 'cocok' => $hit !== [], 'kata' => array_slice($hit, 0, 3)];
            if ($hit === []) {
                $uncovered[] = $it;
            }
        }

        return ['rows' => $rows, 'uncovered' => $uncovered];
    }

    /** @return list<string> label legalitas yang kosong */
    public static function missingLegal(array $legal): array
    {
        $fields = ['nib' => 'NIB', 'npwp' => 'NPWP', 'akta' => 'No. Akta pendirian'];
        $missing = [];
        foreach ($fields as $key => $label) {
            if (trim((string) ($legal[$key] ?? '')) === '') {
                $missing[] = $label;
            }
        }

        return $missing;
    }
}
