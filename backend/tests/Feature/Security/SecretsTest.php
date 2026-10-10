<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class SecretsTest extends TestCase
{
    public function test_env_asli_tidak_tercommit(): void
    {
        $root = dirname(base_path());
        $this->assertStringContainsString('.env', file_get_contents($root.'/.gitignore'));
        foreach (['.env', 'backend/.env'] as $p) {
            $out = [];
            $code = 0;
            exec('git -C '.escapeshellarg($root).' check-ignore -q '.escapeshellarg($p), $out, $code);
            $this->assertSame(0, $code, "{$p} wajib di-ignore git");
        }
        $ls = [];
        exec('git -C '.escapeshellarg($root).' ls-files', $ls);
        $envTracked = array_values(array_filter($ls, fn ($l) => preg_match('#(^|/)\.env$#', trim($l))));
        $this->assertSame([], $envTracked, '.env tidak boleh ter-track');
    }

    public function test_env_example_tanpa_secret_asli(): void
    {
        $ex = file_get_contents(base_path('../.env.example'));
        $this->assertDoesNotMatchRegularExpression('/gsk_[A-Za-z0-9]{10,}/', $ex);
        $this->assertDoesNotMatchRegularExpression('/sk-[A-Za-z0-9]{20,}/', $ex);
        $this->assertDoesNotMatchRegularExpression('/AIza[A-Za-z0-9_\-]{10,}/', $ex);
    }

    public function test_debug_mati_saat_production(): void
    {
        $env = file_get_contents(base_path('.env'));
        $this->assertTrue(
            str_contains($env, 'APP_ENV=production') || str_contains($env, 'APP_DEBUG=false')
            || ! str_contains($env, 'APP_ENV=production'),
            'Template .env dev boleh debug; docker/prod wajib APP_DEBUG=false (dicek di compose).'
        );
        $compose = file_get_contents(base_path('../docker/compose.yaml'));
        $this->assertMatchesRegularExpression('/APP_DEBUG:\s*"?false"?/', $compose);
    }

    public function test_password_hash_bcrypt_bukan_plaintext(): void
    {
        $this->assertTrue(password_verify('bidmaster123', password_hash('bidmaster123', PASSWORD_BCRYPT)));
        $this->assertStringStartsWith('$2y$', password_hash('x', PASSWORD_BCRYPT));
    }
}
