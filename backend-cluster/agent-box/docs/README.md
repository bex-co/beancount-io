# Claude Code Sandbox Documentation

This directory contains detailed documentation for the SSE streaming implementation.

## 📚 Documentation

### [ARCHITECTURE.md](./ARCHITECTURE.md)
End-to-end request flow with Mermaid diagram covering all three execution modes
(blocking, async, streaming), the 2-step classification pipeline (question vs task,
needsRepo vs shortcut), and a key-files reference table.

### [SSE-STREAMING.md](./SSE-STREAMING.md)
Comprehensive guide to the Server-Sent Events (SSE) streaming implementation.

**Contents:**
- API usage guide (streaming vs blocking modes)
- Event types reference (11 different events)
- Client implementation examples (JavaScript/TypeScript)
- Testing instructions
- Architecture details
- Cloudflare Workers compatibility notes

### [IMPLEMENTATION-SUMMARY.md](./IMPLEMENTATION-SUMMARY.md)
Technical summary of the SSE implementation.

**Contents:**
- What was implemented (SSE infrastructure, helper functions, handlers)
- Files created and modified
- Event flow diagram (0% → 100%)
- Testing results
- Usage examples
- Key features and benefits

### [CORS-FIX.md](./CORS-FIX.md)
CORS configuration and troubleshooting guide.

**Contents:**
- CORS issue diagnosis
- Solution implementation (OPTIONS handler, headers)
- Testing procedures
- Security considerations for production
- Common CORS errors and fixes

## 🧪 Quick Start

1. **Read [SSE-STREAMING.md](./SSE-STREAMING.md)** to understand how SSE streaming works
2. **Use [test-sse.html](../test-sse.html)** to test the implementation
3. **Refer to [CORS-FIX.md](./CORS-FIX.md)** if you encounter CORS issues

## 🔗 Related Files

- [`../test-sse.html`](../test-sse.html) - Interactive SSE test client
- [`../src/index.ts`](../src/index.ts) - Main implementation
- [`../README.md`](../README.md) - Project overview
