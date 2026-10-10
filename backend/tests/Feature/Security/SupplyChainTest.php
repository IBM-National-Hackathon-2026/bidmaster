<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class SupplyChainTest extends TestCase
{
    public function test_composer_lock_valid(): void
    {
        $out = [];
        $code = 0;
        exec('composer validate --no-check-all --no-check-publish 2>&1', $out, $code);
        $this->assertSame(0, $code, implode("\n", $out));
    }

    public function test_lock_tersedia_dan_php_memenuhi_platform(): void
    {
        $this->assertFileExists(base_path('composer.lock'));
        $lock = json_decode(file_get_contents(base_path('composer.lock')), true);
        $this->assertArrayHasKey('packages', $lock);
        $this->assertTrue(version_compare(PHP_VERSION, '8.2.0', '>='));
        $this->assertFileExists(dirname(base_path()).'/frontend/package-lock.json');
    }
}
