<?php

namespace App\Providers;

use App\Gates\GateEvaluator;
use App\Repositories\Contracts\AuditRepository;
use App\Repositories\Contracts\MemberRepository;
use App\Repositories\Contracts\TokenRepository;
use App\Repositories\EloquentAuditRepository;
use App\Repositories\EloquentMemberRepository;
use App\Repositories\EloquentTokenRepository;
use App\Services\DraftComposerService;
use App\Services\KnowledgeService;
use Illuminate\Support\ServiceProvider;

class BidMasterServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(MemberRepository::class, EloquentMemberRepository::class);
        $this->app->bind(TokenRepository::class, EloquentTokenRepository::class);
        $this->app->bind(AuditRepository::class, EloquentAuditRepository::class);
        $this->app->singleton(KnowledgeService::class,
            fn () => new KnowledgeService(config('bidmaster.knowledge_dir')));
        $this->app->singleton(GateEvaluator::class, fn () => new GateEvaluator);
        $this->app->singleton(DraftComposerService::class, fn ($app) => new DraftComposerService(
            $app->make(KnowledgeService::class), $app->make(GateEvaluator::class)));
    }
}
