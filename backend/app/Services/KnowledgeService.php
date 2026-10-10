<?php

namespace App\Services;

use Symfony\Component\Yaml\Yaml;

/**
 * Loader knowledge + fallback .example (pola .env.example).
 * File asli (*.md/*.yaml) rahasia perusahaan; yang di-push hanya *.example.
 */
class KnowledgeService
{
    public const TAG = '[perlu konfirmasi';

    public function __construct(private string $dir) {}

    public function read(string $name): string
    {
        $p = $this->dir.DIRECTORY_SEPARATOR.$name;
        if (is_file($p)) {
            $txt = file_get_contents($p);
        } else {
            $stem = pathinfo($name, PATHINFO_FILENAME).'.example';
            $txt = file_get_contents($this->dir.DIRECTORY_SEPARATOR.$stem);
        }
        // Strip header sanitasi "# CONTOH ..." sampai baris kosong pertama.
        if (str_starts_with(ltrim($txt), '# CONTOH')) {
            $lines = explode("\n", $txt);
            foreach ($lines as $i => $ln) {
                if (trim($ln) === '') {
                    return ltrim(implode("\n", array_slice($lines, $i + 1)))."\n";
                }
            }
        }

        return $txt;
    }

    /** @return array{template:string,catalog:array} */
    public function website(): array
    {
        $template = $this->read('proposal_template.md');
        if (($i = strpos($template, '# {client_name}')) !== false) {
            $template = substr($template, $i);
        }

        return ['template' => $template, 'catalog' => Yaml::parse($this->read('price_catalog.yaml'))];
    }

    /** @return array{tender:array,template:string,company:string,team:array} */
    public function tender(): array
    {
        return [
            'tender' => Yaml::parse($this->read('tender_price.yaml')),
            'template' => $this->read('tender_template.md'),
            'company' => $this->read('tender_company.md'),
            'team' => Yaml::parse($this->read('tender_team.yaml')),
        ];
    }
}
