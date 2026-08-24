# CORS Fix for SSE Streaming

## Issue
When testing the SSE implementation from the HTML test client (`test-sse.html`), browsers were blocking requests with:

```
Access to fetch at 'http://localhost:8787/' from origin 'http://localhost:63342'
has been blocked by CORS policy: Response to preflight request doesn't pass
access control check: No 'Access-Control-Allow-Origin' header is present on
the requested resource.
```

## Root Cause
The API wasn't handling CORS (Cross-Origin Resource Sharing) properly:
1. No response to OPTIONS preflight requests
2. Missing `Access-Control-Allow-Origin` headers in responses

## Solution

### 1. Added OPTIONS Handler (Preflight Requests)
```typescript
// Handle CORS preflight requests
if (request.method === 'OPTIONS') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400'  // Cache preflight for 24 hours
    }
  });
}
```

### 2. Added CORS Helper Function
```typescript
// Helper to create JSON response with CORS headers
function jsonResponse(data: any, options: { status?: number } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: options.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

### 3. Updated All JSON Responses
Changed all `Response.json()` calls in blocking mode to use `jsonResponse()`:

**Before:**
```typescript
return Response.json({ error: 'Missing required fields' }, { status: 400 });
```

**After:**
```typescript
return jsonResponse({ error: 'Missing required fields' }, { status: 400 });
```

### 4. SSE Streaming Already Had CORS
The streaming handler already had CORS headers:
```typescript
return new Response(readable, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'  // ← Already present
  }
});
```

## Testing

### Before Fix
```bash
# Browser console showed:
Access to fetch at 'http://localhost:8787/' has been blocked by CORS policy
```

### After Fix
```bash
# Run dev server
npm run dev

# Open test-sse.html in browser
# ✅ Requests now work from any origin
```

## CORS Headers Explained

| Header | Purpose | Value |
|--------|---------|-------|
| `Access-Control-Allow-Origin` | Which origins can access | `*` (all origins) |
| `Access-Control-Allow-Methods` | Which HTTP methods allowed | `POST, OPTIONS` |
| `Access-Control-Allow-Headers` | Which headers can be sent | `Content-Type, Accept` |
| `Access-Control-Max-Age` | Cache preflight response | `86400` (24 hours) |

## Security Note

Currently using `Access-Control-Allow-Origin: *` which allows **all origins**.

**For production**, consider:

1. **Specific origins:**
   ```typescript
   'Access-Control-Allow-Origin': 'https://your-app.com'
   ```

2. **Dynamic origin validation:**
   ```typescript
   const allowedOrigins = ['https://app1.com', 'https://app2.com'];
   const origin = request.headers.get('Origin');
   if (origin && allowedOrigins.includes(origin)) {
     headers['Access-Control-Allow-Origin'] = origin;
   }
   ```

3. **Credentials support:**
   ```typescript
   'Access-Control-Allow-Credentials': 'true'
   // Note: Cannot use * for origin when credentials are true
   ```

## Files Modified

- `src/index.ts` - Added OPTIONS handler and jsonResponse helper

## Verification

✅ TypeScript compilation passes:
```bash
npm run typecheck
# ✓ TypeScript compilation successful!
```

✅ Works from browser:
- Open `test-sse.html`
- Fill in form
- Click "Start SSE Streaming Request"
- ✅ No CORS errors
- ✅ Events stream successfully

## Summary

CORS is now fully configured for both SSE streaming and blocking modes, allowing the HTML test client (and any web application) to communicate with the API from any origin.
