# Claude Code Sandbox - Technical Documentation

This document provides technical context for AI assistants and developers working on the Claude Code Sandbox project.

## Project Overview

Claude Code Sandbox is a Cloudflare Worker application that executes Claude Code (Anthropic's AI coding assistant) on isolated sandboxes. It provides real-time streaming (SSE), async, and blocking execution modes with automatic GitHub/Gitea pull request creation.

## Architecture

### Core Components

1. **API Layer** (`src/index.ts`, `src/api/`)
   - Hono-based web framework with OpenAPI documentation (chanfana)
   - Multiple execution endpoints: streaming, async, blocking
   - Admin token authentication middleware

2. **Task Manager** (`src/task-manager.ts`)
   - Cloudflare Durable Object for task state management
   - Handles task lifecycle: pending → running → completed/failed
   - Stores progress events for SSE streaming

3. **Workflow Engine** (`src/workflow.ts`)
   - Orchestrates the complete execution workflow
   - Phases: validation → classification → setup → planning → execution → finalization
   - Two workflow types: "question" (read-only) and "task" (code changes)

4. **Sandbox Integration** (`src/sandbox.ts`)
   - Interacts with Cloudflare Sandbox API
   - Executes Claude Code with proper environment setup
   - Git operations: clone, commit, push

5. **GitHub/Gitea Integration** (`src/github.ts`, `src/gitea.ts`)
   - Pull request creation and updates
   - AI-powered implementation plan generation
   - Repository classification and URL parsing

## Internationalization (i18n)

### Overview

The beancount-stream feature implements **server-side internationalization** for progress/status messages. Messages are translated on the backend before sending to clients via Server-Sent Events (SSE).

### Supported Locales

- `en` - English (default/fallback)
- `zh` - Chinese (Simplified)
- `ko` - Korean
- `ja` - Japanese
- `es` - Spanish
- `pt` - Portuguese

### Architecture

**Directory Structure:**
```
src/features/beancount-stream/
├── i18n/
│   ├── config.ts           # i18next initialization
│   └── locale-detector.ts  # Accept-Language parser
└── translations/
    ├── en.json            # English translations
    ├── zh.json            # Chinese translations
    ├── ko.json            # Korean translations
    ├── ja.json            # Japanese translations
    ├── es.json            # Spanish translations
    └── pt.json            # Portuguese translations
```

**Flow:**
1. Client sends request with `Accept-Language` header (e.g., `zh-CN,zh;q=0.9,en;q=0.8`)
2. `streaming-handler.ts` detects locale using `accept-language-parser`
3. Locale passed to TaskManager via `requestData.locale`
4. TaskManager extracts locale (defaults to `en` if not specified)
5. Progress messages translated using i18next's `t()` function
6. SSE events sent with pre-translated messages

### Translation Key Naming

**Pattern:** `<feature-name>.<category>.<subcategory>.<action>`

All keys use a **flat JSON structure** with dot-notation:

```json
{
  "beancount-stream.progress.init": "Initializing...",
  "beancount-stream.progress.validating": "Validating request...",
  "beancount-stream.progress.classifying": "Analyzing request type...",
  "beancount-stream.progress.question.clone": "Cloning repository...",
  "beancount-stream.progress.question.setup": "Setting up environment...",
  "beancount-stream.progress.question.execute.start": "Reading ledger files...",
  "beancount-stream.progress.question.execute.progress": "Beancount AI is analyzing...",
  "beancount-stream.progress.question.completed": "Question answered successfully",
  "beancount-stream.progress.task.clone": "Cloning repository...",
  "beancount-stream.progress.task.setup": "Setting up environment...",
  "beancount-stream.progress.task.plan": "Generating implementation plan...",
  "beancount-stream.progress.task.execute.start": "Executing Claude Code...",
  "beancount-stream.progress.task.execute.progress": "Claude Code is running...",
  "beancount-stream.progress.task.commit": "Committing changes...",
  "beancount-stream.progress.task.pr.create": "Creating pull request...",
  "beancount-stream.progress.task.pr.update": "Updating pull request...",
  "beancount-stream.progress.task.completed": "Task completed successfully"
}
```

**Total Keys:** 17 progress messages

**Rationale:**
- Feature prefix (`beancount-stream.`) enables multiple features to coexist
- Flat structure is easier to read and maintain than nested JSON
- Clear namespacing prevents key conflicts
- Scales naturally as features are added

### Implementation Details

**Dependencies:**
- `i18next` (v23.x) - Core i18n framework
- `i18next-fs-backend` (v2.x) - Filesystem translation loader
- `accept-language-parser` (v1.x) - Accept-Language header parser

**Initialization:** (`src/index.ts`)
```typescript
import { initBeancountStreamI18n } from './features/beancount-stream/i18n/config';

// Initialize i18n on module load (runs once when worker loads)
initBeancountStreamI18n().catch((error) => {
  console.error('Failed to initialize i18n:', error);
});
```

**Locale Detection:** (`src/features/beancount-stream/service/streaming-handler.ts`)
```typescript
import { detectLocale } from '../i18n/locale-detector';

const acceptLanguage = request.headers.get('Accept-Language');
const locale = detectLocale(acceptLanguage);

await taskManager.createTask(taskId, {
  // ... other fields
  locale: locale
});
```

**Translation Usage:** (`src/task-manager.ts`)
```typescript
import { t } from './features/beancount-stream/i18n/config';

const locale = task.requestData.locale || 'en';

await onProgress('init', {
  message: t('beancount-stream.progress.init', locale),
  progress: 0
});
```

### Performance

- **Memory:** ~30KB for all translation files (loaded once at startup)
- **Latency:** <1ms per translation call (synchronous memory lookup)
- **Network:** No additional requests (all server-side)

### Breaking Changes

**Bracket Prefixes Removed:**

Previously, progress messages included bracket prefixes for semantic meaning:
```
message: '[INIT] Initializing...'
message: '[QUESTION-CLONE] Cloning repository...'
```

Now, messages contain only the human-readable text:
```
message: 'Initializing...'  (or localized equivalent)
message: 'Cloning repository...'  (or localized equivalent)
```

**Migration:** Clients should use the `event.type` field (already available in SSE events) for semantic meaning instead of parsing message strings.

### Adding New Languages

1. Create new translation file: `src/features/beancount-stream/translations/{locale}.json`
2. Add all 17 translation keys with appropriate translations
3. Add locale to `SUPPORTED_LOCALES` array in `src/features/beancount-stream/i18n/locale-detector.ts`
4. Add locale to `supportedLngs` array in `src/features/beancount-stream/i18n/config.ts`

### Adding New Translation Keys

1. Add key to all translation files (`en.json`, `zh.json`, etc.)
2. Use flat dot-notation format: `"beancount-stream.category.subcategory.action": "Translation"`
3. Import `t()` function: `import { t } from './features/beancount-stream/i18n/config'`
4. Use in code: `t('beancount-stream.category.subcategory.action', locale)`

## Request Classification

The system automatically classifies requests into two types:

### Question (Read-Only)
- Requests asking about existing code or data
- Uses Claude Code in read-only mode (no file writes)
- Returns answer in `logs` field
- No PR created
- Event: `isQuestion: true`

### Task (Code Changes)
- Requests to modify, add, or fix code
- Creates work-in-progress PR with implementation plan
- Executes Claude Code with write permissions
- Updates PR with changes and summary
- Creates/updates GitHub/Gitea pull requests

**Classification Logic:**
- Explicit `mode: 'ASK'` → Forces question workflow
- No mode or `mode: 'AGENT'` → AI classification via Anthropic API
- Classification result cached in task state

## Progress Events

Progress events are sent via Server-Sent Events (SSE) with the following structure:

```typescript
interface SSEEvent {
  type: SSEEventType;  // Event semantic type
  data: {
    message: string;           // Human-readable status (localized)
    progress?: number;         // 0-100
    prUrl?: string;
    prNumber?: number;
    branchName?: string;
    logs?: string;
    diff?: string;
    hasChanges?: boolean;
    error?: string;
    isQuestion?: boolean;      // true for question workflow
    details?: Record<string, unknown>;
  };
}
```

**Event Types:**
- `init` - Initialization started
- `validating` - Validating request parameters
- `classifying` - Analyzing request type (question vs task)
- `cloning` - Cloning repository
- `setting_up` - Setting up environment
- `generating_plan` - Generating implementation plan
- `creating_pr` - Creating pull request
- `executing` - Executing Claude Code
- `committing` - Committing changes
- `updating_pr` - Updating pull request
- `completed` - Task completed successfully
- `error` - An error occurred

## Type Safety

The codebase uses strict TypeScript with comprehensive type definitions:

- `src/types.ts` - Core types and interfaces
- `src/schemas/` - Zod schemas for request/response validation
- All API endpoints use OpenAPI schemas via chanfana

**Key Types:**
- `RequestData` - API request structure
- `TaskRequestData` - Task state data (compatible with RequestData)
- `TaskState` - Complete task state stored in Durable Object
- `SSEEvent` - Server-Sent Event structure

## Testing

### Test Structure

```
src/__tests__/
├── get-clone-url.test.ts      # Repository URL parsing
├── github.test.ts             # GitHub API integration
├── gitea.test.ts              # Gitea API integration
├── handlers.test.ts           # API handlers
├── index.test.ts              # Worker entry point
├── openapi-spec.test.ts       # OpenAPI validation
├── sandbox.test.ts            # Sandbox operations
├── task-manager.test.ts       # Task management
└── workflow.test.ts           # Workflow orchestration
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
npm run test:ui         # Interactive UI
```

### Test Coverage

Current coverage: **57.16%** statement coverage

Key areas with high coverage:
- Core utilities: 90%+
- API endpoints: 85%+
- Type definitions: 100%
- Request validation: 100%

Areas with lower coverage (integration tested):
- Task workflow execution: ~18% (requires live sandbox)
- Streaming handler: ~1% (requires SSE client)

## Environment Variables

Required environment variables (set in `wrangler.jsonc` or `.dev.vars`):

```bash
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_BASE_URL=https://api.blockeden.xyz/anthropic/{api_key}/v1  # Optional

# Authentication
ADMIN_TOKEN=your-secret-admin-token

# Cloudflare Bindings (auto-configured)
Sandbox=<DurableObjectNamespace>
TASK_MANAGER=<DurableObjectNamespace>
```

## Deployment

### Local Development

```bash
npm install
npm run dev      # or npm start
```

Access at: http://localhost:8787

### Production Deployment

```bash
npm run deploy
```

Deploys to: https://claude-code-sandbox.puncsky.workers.dev

### CI/CD

GitHub Actions workflow (`.github/workflows/claude-code-sandbox.yml`):
- Runs on push to main branch
- Executes: typecheck, lint, tests, coverage
- Auto-deploys to Cloudflare Workers on success

## Best Practices

### Adding New Features

1. **Define types first** in `src/types.ts`
2. **Add Zod schemas** in `src/schemas/`
3. **Implement core logic** in appropriate module
4. **Write tests** in `src/__tests__/`
5. **Update OpenAPI docs** in endpoint class
6. **Add i18n translations** if user-facing messages are added

### Progress Messages

When adding new progress messages:
1. Add translation keys to all locale files
2. Use `t()` function with locale parameter
3. Always provide `progress` value (0-100)
4. Use semantic `event.type` for client handling

### Error Handling

- Log errors with `createLogger()` for structured logging
- Redact credentials using `redactCredentials()` utility
- Provide user-friendly error messages in SSE events
- Store detailed errors in `task.errorDetails` for debugging

## Common Issues

### i18n Not Working

**Symptom:** Messages appear in English despite locale header

**Solutions:**
1. Check i18next initialization in `src/index.ts`
2. Verify translation files exist and are valid JSON
3. Confirm locale is passed through to TaskManager
4. Check for missing translation keys (fallback to English)

### Tests Failing After Changes

**Symptom:** Test expectations don't match function calls

**Solutions:**
1. Update test mocks to match new function signatures
2. Add new parameters to test expectations
3. Mock new dependencies (e.g., i18n functions)
4. Clear test cache: `rm -rf node_modules/.vitest`

### Sandbox Execution Timeout

**Symptom:** Long-running tasks fail with timeout

**Solutions:**
1. Increase `HEARTBEAT_INTERVAL_MS` in `src/config.ts`
2. Optimize Claude Code prompt for faster execution
3. Use async mode for long-running tasks
4. Check Cloudflare Workers CPU time limits

## Resources

- **API Documentation:** https://claude-code-sandbox.puncsky.workers.dev/docs
- **Cloudflare Sandboxes:** https://developers.cloudflare.com/workers/sandbox/
- **i18next Documentation:** https://www.i18next.com/
- **Hono Framework:** https://hono.dev/
- **Chanfana (OpenAPI):** https://github.com/cloudflare/chanfana

## Contributing

When making changes:
1. Follow existing code patterns and naming conventions
2. Add/update tests for new functionality
3. Run full CI suite before committing: `npm run typecheck && npm run lint:check && npm test` (`lint:check` includes Knip dead-code detection; `npm run lint:deadcode:fix` applies removals)
4. Update this documentation for significant changes
5. Use conventional commit messages: `feat:`, `fix:`, `docs:`, `test:`

---

Last updated: 2026-01-27
