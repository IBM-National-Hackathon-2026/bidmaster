<?php

namespace App\Services;

use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\Jc;

/** Markdown → DOCX (heading, bold, tabel, list). Port api/export_docx.py. */
class DocxExportService
{
    public function toBytes(string $markdown): string
    {
        $phpWord = new PhpWord;
        $section = $phpWord->addSection();
        $table = null;
        $tableRows = [];
        $flushTable = function () use (&$table, &$tableRows, $section) {
            if ($tableRows === []) {
                return;
            }
            $first = $tableRows[0];
            $isHeader = count($tableRows) > 1 && preg_match('/^[\s:|\-]+$/', $tableRows[1]);
            $rows = $isHeader ? [$tableRows[0], ...array_slice($tableRows, 2)] : $tableRows;
            $t = $section->addTable(['borderSize' => 4, 'borderColor' => '999999']);
            foreach ($rows as $i => $row) {
                $t->addRow();
                foreach ($row as $cell) {
                    $c = $t->addCell(3000);
                    $txt = trim($cell, ' *');
                    if ($isHeader && $i === 0) {
                        $c->addText($txt, ['bold' => true]);
                    } else {
                        $this->addRich($c, $txt);
                    }
                }
            }
            $tableRows = [];
            $table = null;
        };
        foreach (explode("\n", $markdown) as $rawLine) {
            $line = rtrim(mb_substr($rawLine, 0, 2000));
            if (str_starts_with($line, '|') && str_ends_with($line, '|')) {
                $tableRows[] = array_map('trim', explode('|', trim($line, '|')));
                continue;
            }
            $flushTable();
            if (str_starts_with($line, '### ')) {
                $section->addTitle(mb_substr($line, 4), 3);
            } elseif (str_starts_with($line, '## ')) {
                $section->addTitle(mb_substr($line, 3), 2);
            } elseif (str_starts_with($line, '# ')) {
                $section->addTitle(mb_substr($line, 2), 1);
            } elseif (str_starts_with($line, '- ') || str_starts_with($line, '* ')) {
                $section->addListItem('• '.mb_substr($line, 2));
            } elseif (trim($line) !== '') {
                $this->addRich($section, $line);
            } else {
                $section->addText('');
            }
        }
        $flushTable();
        $tmp = tempnam(sys_get_temp_dir(), 'bm').'.docx';
        $phpWord->save($tmp, 'Word2007');

        return file_get_contents($tmp);
    }

    private function addRich($container, string $text): void
    {
        $run = method_exists($container, 'addTextRun')
            ? $container->addTextRun() : $container;
        foreach (preg_split('/(\*\*.+?\*\*)/', $text, -1, PREG_SPLIT_DELIM_CAPTURE) as $part) {
            if ($part === '') {
                continue;
            }
            if (str_starts_with($part, '**') && str_ends_with($part, '**') && strlen($part) > 4) {
                $run->addText(mb_substr($part, 2, -2), ['bold' => true]);
            } else {
                $run->addText($part);
            }
        }
        if ($run === $container && method_exists($container, 'addText')) {
            $container->addText($text);
        }
    }
}
