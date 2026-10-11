<?php

namespace App\Services;

use App\Models\Proposal;

/** Harga proposal ditentukan manusia; katalog hanya acuan + snapshot. */
class PriceService
{
    public const ALASAN = ['kontrak lanjutan', 'volume besar', 'tingkat kesulitan', 'negosiasi klien', 'lainnya'];

    public const MAX_BARIS = 10_000_000_000;

    public function __construct(private KnowledgeService $knowledge) {}

    /** @return array{kode:string,nama:string,satuan:string,harga_acuan:int} */
    public function katalog(): array
    {
        $out = [];
        foreach ($this->knowledge->tender()['tender']['komponen'] as $k) {
            $out[$k['kode']] = ['kode' => $k['kode'], 'nama' => $k['nama'],
                'satuan' => $k['satuan'], 'harga_acuan' => (int) $k['harga_dasar']];
        }

        return $out;
    }

    /** Inisialisasi baris dari usulan analisis (sekali; snapshot acuan). */
    public function initRows(Proposal $proposal): array
    {
        if (($proposal->prices ?? []) !== []) {
            return $proposal->prices;
        }
        $kat = $this->katalog();
        $agg = [];
        foreach ($proposal->items ?? [] as $it) {
            foreach ($it['komponen_usulan'] ?? [] as $u) {
                $kode = $u['kode'];
                if (! isset($kat[$kode])) {
                    continue;
                }
                $agg[$kode] = ['kode' => $kode, 'nama' => $kat[$kode]['nama'],
                    'satuan' => $kat[$kode]['satuan'],
                    'qty' => ($agg[$kode]['qty'] ?? 0) + (int) $u['qty'],
                    'harga_acuan' => $kat[$kode]['harga_acuan'],
                    'harga_proposal' => $kat[$kode]['harga_acuan'],
                    'alasan' => '', 'alasan_catatan' => ''];
            }
        }

        return array_values($agg);
    }

    public static function deviasi(int $acuan, int $proposal): int
    {
        if ($acuan <= 0) {
            return 0;
        }

        return (int) round(abs($proposal - $acuan) / $acuan * 100);
    }

    public static function lencana(int $acuan, int $proposal): string
    {
        if ($proposal === $acuan) {
            return '';
        }
        $pct = self::deviasi($acuan, $proposal);

        return ($proposal < $acuan ? 'turun ' : 'naik ').$pct.'%';
    }

    /**
     * @return array{rows:list<array>,subtotal:int,diskon_rp:int,total:int,
     *   perlu_persetujuan:bool,sebab:list<string>,pagu_ok:bool|null}
     */
    public function ringkasan(Proposal $proposal): array
    {
        $rows = [];
        $subtotal = 0;
        $sebab = [];
        foreach ($proposal->prices ?? [] as $r) {
            $sub = $r['harga_proposal'] * $r['qty'];
            $subtotal += $sub;
            $dev = self::deviasi($r['harga_acuan'], $r['harga_proposal']);
            if ($dev > 15) {
                $sebab[] = "{$r['kode']} menyimpang {$dev}% dari acuan";
            }
            $rows[] = array_merge($r, ['subtotal' => $sub, 'deviasi' => $dev,
                'lencana' => self::lencana($r['harga_acuan'], $r['harga_proposal'])]);
        }
        $disc = $proposal->discount ?? [];
        $tipe = $disc['tipe'] ?? 'persen';
        $nilai = (int) ($disc['nilai'] ?? 0);
        $diskonRp = $tipe === 'nominal' ? min($nilai, $subtotal)
            : (int) round($subtotal * min($nilai, 100) / 100);
        if ($tipe === 'persen' && $nilai > 10) {
            $sebab[] = "diskon {$nilai}% melebihi 10%";
        }
        if ($tipe === 'nominal' && $subtotal > 0 && $diskonRp / $subtotal * 100 > 10) {
            $sebab[] = 'diskon nominal melebihi 10% dari subtotal';
        }
        $total = max(0, $subtotal - $diskonRp);
        $pagu = $proposal->pagu;

        return ['rows' => $rows, 'subtotal' => $subtotal, 'diskon_rp' => $diskonRp,
            'total' => $total, 'perlu_persetujuan' => $sebab !== [], 'sebab' => $sebab,
            'pagu_ok' => $pagu === null ? null : $total <= $pagu];
    }

    public static function fmt(int $n): string
    {
        return 'Rp '.number_format($n, 0, ',', '.');
    }
}
