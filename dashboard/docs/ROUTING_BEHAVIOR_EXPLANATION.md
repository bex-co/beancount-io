# Why `/files/upload` beforeLoad is Invoked When Navigating to `/files/new/xxx`

## Problem Summary

When navigating to `/ledger/$ledgerOwner/$ledgerName/files/new/$branch/$`, the `beforeLoad` hook in `/ledger/$ledgerOwner/$ledgerName/files/upload` is being invoked, even though these are sibling routes and the upload route doesn't match the target URL.

## Route Structure

From `routeTree.gen.ts`:

```typescript
// Both routes share the same parent
const LedgerLedgerOwnerLedgerNameFilesUploadRoute = {
  id: "/files/upload",
  path: "/files/upload",
  getParentRoute: () => LedgerLedgerOwnerLedgerNameRoute, // Same parent
};

const LedgerLedgerOwnerLedgerNameFilesNewBranchSplatRoute = {
  id: "/files/new/$branch/$",
  path: "/files/new/$branch/$",
  getParentRoute: () => LedgerLedgerOwnerLedgerNameRoute, // Same parent
};
```

**Key Observation**: Both routes are **siblings** under `LedgerLedgerOwnerLedgerNameRoute`.

## TanStack Router Route Matching Process

According to TanStack Router documentation, the navigation process has three phases:

### Phase 1: Route Matching (Top-Down)

- Path parameters are parsed
- Search parameters are validated
- Routes are matched using a **segment trie** data structure

**Source**: [TanStack Router Data Loading Guide](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)

### Phase 2: BeforeLoad Hooks (Serial, Parent → Child)

- `beforeLoad` hooks execute in route hierarchy order
- From outermost route down through children
- **Only for routes that match the new URL**

**Source**: [TanStack Router Authenticated Routes Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)

### Phase 3: Loader & Component Preload (Parallel)

- Loaders run after all `beforeLoad` hooks complete
- Component preload happens in parallel

## Why This Behavior Occurs

### Theory 1: Route Evaluation During Matching Phase

TanStack Router uses a **segment trie** for route matching. During the matching process, the router may evaluate multiple potential routes as it traverses the trie structure.

**Source**: [TanStack Router Route Matching Tree Rewrite Blog Post](https://tanstack.com/router/latest/docs/framework/react/routing/route-matching)

The trie traversal might cause `beforeLoad` hooks to be evaluated for routes that are being considered during the matching phase, even if they don't ultimately match.

### Theory 2: Sibling Route Evaluation Order

According to TanStack Router's route matching algorithm, sibling routes are evaluated in a specific order:

1. **Index routes** (highest priority)
2. **Static routes** (e.g., `/files/upload`)
3. **Dynamic routes** (e.g., `/files/new/$branch/$`)
4. **Splat/Wildcard routes** (lowest priority)

**Source**: [TanStack Router Route Matching Documentation](https://tanstack.com/router/latest/docs/framework/react/routing/route-matching)

When navigating to `/files/new/main/path`:

- The router starts at the parent route `/ledger/$ledgerOwner/$ledgerName`
- It evaluates children, including `/files/upload` (static) before `/files/new/$branch/$` (dynamic)
- During this evaluation, the `beforeLoad` hook might be invoked

### Theory 3: Route Matching Algorithm Behavior

The segment trie matching algorithm walks through potential routes segment by segment. At the `/files` segment level, both `/files/upload` and `/files/new` are potential matches until the next segment is examined.

**Source**: [TanStack Router Blog - Route Matching Tree Rewrite](https://tanstack.com/blog/tanstack-router-route-matching-tree-rewrite)

## Evidence from Code

Looking at the route definitions:

```typescript
// ledger.$ledgerOwner.$ledgerName.files.upload.tsx
export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/files/upload",
)({
  beforeLoad: ({ params, search, location }) => {
    // This hook was being called even when navigating to /files/new/xxx
  },
});
```

The `beforeLoad` hook receives `location` parameter, which contains the target URL. This suggests the hook is being called during the navigation/matching phase, potentially before the final route match is determined.

## Known Issues & Bug Reports

There are several GitHub issues related to `beforeLoad` behavior:

1. **Issue #1882**: Infinite pending state when redirecting to current nested route
   - [GitHub Issue](https://github.com/TanStack/router/issues/1882)

2. **Issue #1553**: `beforeLoad` doesn't wait for async context changes
   - [GitHub Issue](https://github.com/TanStack/router/issues/1553)

3. **Issue #1324**: Same-URL navigation may not trigger `beforeLoad`/`loader` again
   - [GitHub Issue](https://github.com/TanStack/router/issues/1324)

These issues suggest that `beforeLoad` behavior can be unpredictable in certain scenarios.

## Solution

The fix adds a guard to check if the current pathname actually matches the upload route pattern before processing:

```typescript
beforeLoad: ({ params, search, location }) => {
  // Only process if the pathname actually matches the upload route pattern
  const isUploadRoute =
    location.pathname.endsWith("/files/upload") ||
    location.pathname.includes("/files/upload/");

  if (!isUploadRoute) {
    return; // Not an upload route, skip processing
  }
  // ... rest of the logic
};
```

This ensures the hook only executes its logic when the route actually matches, preventing side effects when navigating to sibling routes.

## References

1. [TanStack Router - Data Loading Guide](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)
2. [TanStack Router - Authenticated Routes Guide](https://tanstack.com/router/latest/docs/framework/react/guide/authenticated-routes)
3. [TanStack Router - Route Matching Documentation](https://tanstack.com/router/latest/docs/framework/react/routing/route-matching)
4. [TanStack Router Blog - Route Matching Tree Rewrite](https://tanstack.com/blog/tanstack-router-route-matching-tree-rewrite)
5. [GitHub Issue #1882 - Infinite pending state](https://github.com/TanStack/router/issues/1882)
6. [GitHub Issue #1553 - beforeLoad async context](https://github.com/TanStack/router/issues/1553)
7. [GitHub Issue #1324 - Same-URL navigation](https://github.com/TanStack/router/issues/1324)
