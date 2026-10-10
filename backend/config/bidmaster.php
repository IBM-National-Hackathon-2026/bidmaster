<?php

return [
    'seed_admin_pass' => env('SEED_ADMIN_PASS', 'bidmaster123'),
    'session_hours' => 12,
    'langflow_url' => env('LANGFLOW_URL', ''),
    'langflow_key' => env('LANGFLOW_API_KEY', ''),
    'langflow_flow' => env('LANGFLOW_FLOW', 'generate_proposal_draft'),
    'knowledge_dir' => env('KNOWLEDGE_DIR', base_path('../knowledge')),
];
