# SSE Streaming Implementation

This document describes the Server-Sent Events (SSE) streaming implementation for the Claude Code Sandbox API.

## Overview

The API now supports **two modes**:

1. **SSE Streaming Mode** - Real-time progress updates via Server-Sent Events
2. **Blocking Mode (Legacy)** - Original JSON response (backward compatible)

The mode is determined by the `Accept` header in the request.

## SSE Streaming Mode

### Client Request

```javascript
fetch('http://localhost:8787', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream'  // ← This triggers SSE streaming
  },
  body: JSON.stringify({
    repo: 'https://github.com/user/repo.git',
    task: 'Add a README file',
    githubToken: 'ghp_xxxxxxxxxxxx',
    baseBranch: 'main',  // optional, defaults to 'main'
    gitUserName: 'Claude Code Bot',  // optional
    gitUserEmail: 'claude-code@anthropic.com'  // optional
  })
});
```

### Event Types

The API sends 11 different event types during execution:

| Event Type | Description | Progress Range |
|------------|-------------|----------------|
| `init` | Request initialization | 0% |
| `validating` | Parameter validation | 5-10% |
| `cloning` | Repository cloning | 15-30% |
| `setting_up` | Environment setup | 35-40% |
| `generating_plan` | Plan generation via Claude API | 45-50% |
| `creating_pr` | Creating WIP pull request | 52-60% |
| `executing` | Running Claude Code (long operation) | 62-80% |
| `committing` | Git commit and push | 82-90% |
| `updating_pr` | Updating PR description and status | 92-98% |
| `completed` | All tasks completed successfully | 100% |
| `error` | Error occurred at any stage | - |

### Event Data Structure

Each event includes a data payload with the following structure:

```typescript
{
  message: string;        // Human-readable progress message
  progress?: number;      // 0-100
  prUrl?: string;         // Pull request URL (when available)
  prNumber?: number;      // Pull request number (when available)
  branchName?: string;    // Git branch name (when available)
  logs?: string;          // Claude Code execution logs (when available)
  diff?: string;          // Git diff (on completion)
  error?: string;         // Error message (on error events)
  details?: any;          // Additional context (varies by event)
}
```

### Example SSE Event Stream

```
event: init
data: {"message":"Initializing request...","progress":0}

event: validating
data: {"message":"Validating request parameters...","progress":5}

event: cloning
data: {"message":"Initializing sandbox environment...","progress":15}

event: cloning
data: {"message":"Cloning repository https://github.com/user/repo.git...","progress":20}

event: cloning
data: {"message":"Repository cloned successfully","progress":30}

event: setting_up
data: {"message":"Setting up environment...","progress":35}

event: generating_plan
data: {"message":"Calling Claude API to generate implementation plan...","progress":48}

event: generating_plan
data: {"message":"Plan generated","progress":50,"details":"## Overview\n...plan content..."}

event: creating_pr
data: {"message":"Creating work-in-progress PR...","progress":52}

event: creating_pr
data: {"message":"PR created: https://github.com/user/repo/pull/123","progress":60,"prUrl":"https://github.com/user/repo/pull/123","prNumber":123,"branchName":"claude-code/2025-12-20-add-readme"}

event: executing
data: {"message":"Executing Claude Code...","progress":62}

event: executing
data: {"message":"Beancount AI is analyzing the ledger...","progress":70}

event: executing
data: {"message":"Claude Code execution completed","progress":80,"logs":"...execution logs..."}

event: committing
data: {"message":"Checking for changes...","progress":82}

event: committing
data: {"message":"Committing changes...","progress":85}

event: committing
data: {"message":"Changes committed and pushed","progress":85}

event: committing
data: {"message":"Commit phase completed","progress":90}

event: updating_pr
data: {"message":"Updating PR description...","progress":92}

event: updating_pr
data: {"message":"PR description updated","progress":95}

event: updating_pr
data: {"message":"PR marked as ready for review","progress":95}

event: completed
data: {"message":"All tasks completed successfully","progress":100,"prUrl":"https://github.com/user/repo/pull/123","prNumber":123,"branchName":"claude-code/2025-12-20-add-readme","logs":"...full logs...","diff":"...git diff..."}
```

### Client Implementation Example

#### Using EventSource (Simple)

**Note:** EventSource doesn't support custom headers or POST requests, so you need to use fetch with ReadableStream.

#### Using Fetch + ReadableStream (Recommended)

```javascript
async function streamClaudeCode(repo, task, githubToken) {
  const response = await fetch('http://localhost:8787', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({ repo, task, githubToken })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    let currentEvent = null;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        const data = JSON.parse(line.substring(5).trim());
        handleEvent(currentEvent, data);
        currentEvent = null;
      }
    }
  }
}

function handleEvent(eventType, data) {
  console.log(`[${eventType}] ${data.message} (${data.progress}%)`);

  if (data.prUrl) {
    console.log(`  PR: ${data.prUrl}`);
  }

  if (eventType === 'completed') {
    console.log('Done!', data);
  } else if (eventType === 'error') {
    console.error('Error:', data.error);
  }
}
```

## Blocking Mode (Backward Compatible)

### Client Request

```javascript
fetch('http://localhost:8787', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'  // ← This triggers blocking mode
    // OR omit Accept header entirely
  },
  body: JSON.stringify({
    repo: 'https://github.com/user/repo.git',
    task: 'Add a README file',
    githubToken: 'ghp_xxxxxxxxxxxx'
  })
});
```

### Response

The API waits for the entire operation to complete and returns a single JSON response:

```json
{
  "logs": "...Claude Code execution logs...",
  "diff": "...git diff...",
  "prUrl": "https://github.com/user/repo/pull/123",
  "prNumber": 123,
  "branchName": "claude-code/2025-12-20-add-readme",
  "status": "completed"
}
```

Or on error:

```json
{
  "error": "Failed to process request",
  "details": "Error message details"
}
```

## Testing

### 1. Interactive HTML Test Client

Open `test-sse.html` in a browser:

```bash
open test-sse.html
```

This provides a visual interface to:
- Test SSE streaming mode
- Test blocking (JSON) mode
- See real-time progress updates
- View progress bar
- Inspect all events and data

### 2. Command Line Testing

**SSE Streaming:**
```bash
curl -N -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "repo": "https://github.com/user/repo.git",
    "task": "Add a README file",
    "githubToken": "ghp_xxxxxxxxxxxx"
  }'
```

**Blocking Mode:**
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "repo": "https://github.com/user/repo.git",
    "task": "Add a README file",
    "githubToken": "ghp_xxxxxxxxxxxx"
  }'
```

## Implementation Details

### Architecture

The implementation uses:

1. **SSEWriter class** - Helper for encoding and writing SSE messages
2. **onProgress callbacks** - All helper functions accept optional progress callbacks
3. **TransformStream** - Cloudflare Workers streaming API for SSE responses
4. **Content negotiation** - Route requests based on Accept header

### Key Files Modified

- `src/index.ts` - Main implementation with streaming support

### Progress Tracking

Progress is tracked at these milestones:

- **0%** - Request initialization
- **5-10%** - Validation
- **15-30%** - Repository cloning
- **35-40%** - Environment setup (user, git config)
- **45-50%** - Plan generation (Claude API call)
- **52-60%** - PR creation (branch, commit, push, GitHub API)
- **62-80%** - Claude Code execution (THE LONGEST OPERATION)
- **82-90%** - Git commit and push
- **92-98%** - PR updates (description, remove WIP prefix)
- **100%** - Completion

### Error Handling

Errors at any stage:
1. Send an `error` event with details
2. Close the SSE stream gracefully
3. Preserve context about which step failed

Example error event:

```
event: error
data: {"message":"Failed to process request","error":"Cannot parse repository URL"}
```

## Benefits of SSE Streaming

1. **Real-time feedback** - Users see progress instead of waiting blindly
2. **Better UX** - Show what the agent is thinking and doing
3. **Debuggability** - See exactly where failures occur
4. **No timeouts** - Long operations are visible, not mysterious
5. **Backward compatible** - Existing clients continue to work

## Cloudflare Workers Compatibility

This implementation works within Cloudflare Workers constraints:

- ✅ Uses native TransformStream API
- ✅ No buffering of large responses in memory
- ✅ Streams events as they occur
- ✅ Works within Workers' execution time limits
- ✅ No additional infrastructure required (no WebSockets/Durable Objects needed)

## Limitations

1. **One-way communication** - Server → Client only (use WebSockets if you need bidirectional)
2. **No cancellation** - Once started, the operation continues (could add with Durable Objects)
3. **No persistence** - If connection drops, progress is lost (could add with Durable Objects)

## Future Enhancements

Potential improvements:

1. **Heartbeat for long operations** - Send periodic "still working" events during Claude Code execution
2. **Cancellation support** - Allow clients to cancel in-progress operations
3. **Progress persistence** - Store state in Durable Objects for reconnection
4. **Streaming Claude Code logs** - Show logs as they're generated (requires sandbox API changes)
5. **Batch operations** - Queue multiple tasks with progress tracking

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

The SSE streaming is automatically available - no configuration changes needed.

## Summary

The SSE streaming implementation provides real-time visibility into Claude Code execution while maintaining full backward compatibility with existing clients. It uses Cloudflare Workers' native streaming APIs for efficient, scalable operation.
