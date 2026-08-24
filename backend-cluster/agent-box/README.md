# Claude Code 🧡 Sandbox SDK

Run Claude Code on Cloudflare Sandboxes with real-time streaming or async execution!

- Execute Claude Code with AI-powered code generation on isolated sandboxes
- Multiple execution modes: streaming (SSE), async, or blocking
- Automatic pull request creation with work-in-progress and ready states
- Comprehensive OpenAPI documentation with interactive Scalar UI

## 📚 API Documentation

**Interactive Documentation (Scalar UI)**:
- Production: https://claude-code-sandbox.puncsky.workers.dev/docs
- Local: http://localhost:8787/docs

**OpenAPI Specification**:
- JSON format: https://claude-code-sandbox.puncsky.workers.dev/openapi.json

The documentation includes:
- All available endpoints with request/response schemas
- Interactive "Try it out" functionality
- Request examples and response schemas
- Authentication requirements

## Production Deployment

**Live URL**: https://claude-code-sandbox.puncsky.workers.dev

**Health Check**: https://claude-code-sandbox.puncsky.workers.dev/healthz

## Development

### Install Dependencies

```bash
npm install
```

### Local Development

```bash
npm run dev
# or
npm start
```

### Deploy to Cloudflare

```bash
npm run deploy
```

## API Endpoints

The API provides three execution modes:

### 1. Blocking Mode (POST /execute)
Waits for complete execution and returns full logs and diff.

```bash
curl -X POST http://localhost:8787/execute \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-token" \
  -d '{
    "repo": "https://github.com/owner/repo",
    "task": "Add user authentication feature",
    "githubToken": "ghp_xxxx"
  }'
```

**Response:**
```json
{
  "logs": "...",
  "diff": "...",
  "prUrl": "https://github.com/owner/repo/pull/123",
  "prNumber": 123,
  "branchName": "claude-code/2025-01-06-task",
  "status": "completed"
}
```

### 2. Async Mode (POST /async)
Returns immediately after PR creation, executes in background.

```bash
curl -X POST http://localhost:8787/async \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your-token" \
  -d '{
    "repo": "https://github.com/owner/repo",
    "task": "Add user authentication feature",
    "githubToken": "ghp_xxxx",
    "async": true
  }'
```

**Response:**
```json
{
  "success": true,
  "prUrl": "https://github.com/owner/repo/pull/123",
  "prNumber": 123,
  "branchName": "claude-code/2025-01-06-task",
  "status": "PR created, running Claude Code in background..."
}
```

### 3. Streaming Mode (POST /beancount-stream)
Real-time progress via Server-Sent Events (SSE).

```bash
curl -X POST http://localhost:8787/beancount-stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "x-admin-token: your-token" \
  -d '{
    "repo": "https://github.com/owner/repo",
    "task": "Add user authentication feature",
    "githubToken": "ghp_xxxx"
  }'
```

**Response Stream:**
```
event: init
data: {"type":"init","data":{"message":"Initializing...","progress":0}}

event: cloning
data: {"type":"cloning","data":{"message":"Cloning repository...","progress":20}}

event: completed
data: {"type":"completed","data":{"message":"Done","progress":100,"prUrl":"..."}}
```

### Request Parameters

All execution modes accept the same request body:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `repo` | string | Yes | - | Repository URL (HTTPS, SSH, or owner/repo format) |
| `task` | string | Yes | - | Task description for Claude Code |
| `githubToken` | string | Yes | - | GitHub personal access token with repo permissions |
| `baseBranch` | string | No | "main" | Base branch for pull request |
| `gitUserName` | string | No | "Claude Code Bot" | Git commit author name |
| `gitUserEmail` | string | No | "claude-code@anthropic.com" | Git commit author email |
| `async` | boolean | No | false | Enable async mode (for /async endpoint, must be `true`) |

## Authentication

All API endpoints (except `/healthz` and `/docs`) require authentication via the `x-admin-token` header.

### Local Development

Set the admin token in `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set ADMIN_TOKEN
```

The `.dev.vars` file should contain:

```
ANTHROPIC_API_KEY=<your-anthropic-api-key>
ADMIN_TOKEN=your-secret-admin-token
```

### Backward Compatibility

The original `POST /api` endpoint is still supported for backward compatibility. It automatically routes to the appropriate mode based on headers and body:

```bash
# Auto-routes to streaming mode (Accept: text/event-stream)
curl -X POST http://localhost:8787/api \
  -H "Accept: text/event-stream" \
  -H "x-admin-token: your-token" \
  -d '{"repo":"...","task":"...","githubToken":"..."}'

# Auto-routes to async mode (async: true in body)
curl -X POST http://localhost:8787/api \
  -H "x-admin-token: your-token" \
  -d '{"repo":"...","task":"...","githubToken":"...","async":true}'

# Auto-routes to blocking mode (default)
curl -X POST http://localhost:8787/api \
  -H "x-admin-token: your-token" \
  -d '{"repo":"...","task":"...","githubToken":"..."}'
```

**Recommendation**: Use the dedicated endpoints (`/execute`, `/async`, `/beancount-stream`) for clearer intent and better documentation.

### Error Responses

**401 Unauthorized** - Missing or invalid authentication token:

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing with comprehensive coverage of core functionality.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (useful during development)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests with interactive UI
npm run test:ui
```

### Test Coverage

Current test coverage:

- **utils.ts**: 100% (statements, branches, functions, lines)
- **github.ts**: 100% (GitHub API operations and PR lifecycle)
- **sandbox.ts**: 100% (Sandbox environment setup and Claude Code execution)
- **index.ts**: 100% (HTTP routing and CORS)
- **Overall**: 44% statements, 98% branches, 95% functions

Coverage targets (configured in `vitest.config.ts`):

- Lines: 75%
- Functions: 75%
- Branches: 70%
- Statements: 75%

### Test Structure

Tests are located in `src/__tests__/`:

- `utils.test.ts` - Utility functions (38 tests)
- `github.test.ts` - GitHub API operations with mocked fetch (23 tests)
- `sandbox.test.ts` - Sandbox operations with mocked exec (29 tests)
- `index.test.ts` - HTTP routing and CORS handling (17 tests)

**Total**: 107 tests

### Code Quality

```bash
# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## Continuous Integration

GitHub Actions CI runs automatically on:

- Push to `main` branch (when `claude-code-sandbox/**` files change)
- Pull requests (when `claude-code-sandbox/**` files change)

CI workflow includes:

1. TypeScript type checking
2. ESLint code quality checks
3. Test suite execution
4. Coverage report generation
5. Coverage upload to Codecov (if configured)

See `.github/workflows/claude-code-sandbox.yml` for details.

## Project Structure

```
claude-code-sandbox/
├── src/
│   ├── __tests__/          # Test files
│   │   ├── utils.test.ts
│   │   ├── github.test.ts
│   │   ├── sandbox.test.ts
│   │   └── index.test.ts
│   ├── api/                # OpenAPI endpoint classes
│   │   ├── health-endpoint.ts
│   │   ├── blocking-endpoint.ts
│   │   ├── async-endpoint.ts
│   │   ├── streaming-endpoint.ts
│   │   └── scalar-ui-endpoint.ts
│   ├── schemas/            # Zod validation schemas
│   │   ├── request-schemas.ts
│   │   ├── response-schemas.ts
│   │   └── sse-event-schemas.ts
│   ├── index.ts            # Main worker entry point (Hono + chanfana)
│   ├── handlers.ts         # Request handlers (SSE, async, blocking)
│   ├── github.ts           # GitHub API operations
│   ├── sandbox.ts          # Sandbox environment setup
│   ├── get-clone-url.ts    # URL conversion utilities
│   ├── utils.ts            # Utility functions
│   └── types.ts            # TypeScript type definitions
├── docs/                   # Documentation
├── vitest.config.ts        # Vitest configuration
├── eslint.config.js        # ESLint configuration
├── .prettierrc             # Prettier configuration
├── tsconfig.json           # TypeScript configuration
├── wrangler.jsonc          # Cloudflare Workers configuration
└── package.json            # Dependencies and scripts
```

## Technical Architecture

> **See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** for the full request flow diagram covering classification, shortcut answers, and the task/question pipelines.

### OpenAPI Documentation (chanfana + Scalar UI)

The API uses **chanfana** to auto-generate OpenAPI 3.1 specifications from Zod schemas, served with a beautiful **Scalar UI**.

**Key features:**
- Auto-generated documentation from code
- Type-safe request/response validation
- Interactive API testing via Scalar UI
- Single source of truth for schemas

**Stack:**
- **Hono**: Lightweight web framework
- **chanfana**: OpenAPI auto-generation for Cloudflare Workers
- **Zod**: Runtime validation and schema definition
- **Scalar**: Modern API documentation UI

### Endpoint Pattern

All endpoints extend `OpenAPIRoute` and delegate to existing handlers:

```typescript
export class BlockingEndpoint extends OpenAPIRoute {
  schema = {
    summary: 'Execute Claude Code (Blocking)',
    security: [{ adminToken: [] }],
    request: { body: { content: { 'application/json': { schema: RequestDataSchema } } } },
    responses: { '200': { schema: BlockingResponseSchema } }
  };

  async handle(c: Context) {
    return handleBlockingRequest(c.req.raw, c.env);
  }
}
```

This pattern keeps business logic separate from OpenAPI documentation.

Happy hacking!
