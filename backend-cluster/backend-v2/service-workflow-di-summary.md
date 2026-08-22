# Service Layer, Workflow Layer, and Dependency Injection Design

## Proposed Layering

```text
Resolver / Controller
        ↓
     Workflow
        ↓
     Services
        ↓
 Repository / Prisma
```

### Responsibilities

**Resolver / Controller**

- Authentication / authorization
- Input validation
- Convert request context into command parameters
- Call a workflow or service
- Return response

**Workflow**

- Cross-domain orchestration
- Transaction boundaries
- Coordinates multiple services

**Service**

- Domain-specific business logic
- Reusable by GraphQL, REST, MCP, CLI, Cron, etc.
- Should not depend on GraphQL/Apollo/HTTP concepts

---

# Should Resolvers Only Call Workflows?

Not necessarily.

Simple CRUD operations can call services directly:

```ts
resolver -> accountService.findById()
```

However, when a use case involves multiple services:

```text
Validate account
Create transaction
Attach receipt
Update balance
Write audit log
Publish event
```

the orchestration should live in a workflow:

```text
resolver
   ↓
transactionWorkflow
   ↓
accountService
ledgerService
attachmentService
auditService
```

A useful rule:

> Resolvers may call Services or Workflows, but Resolvers should not orchestrate multiple Services.

---

# Context Design

Keep Context limited to request-scoped data:

```ts
interface Context {
  user: User;
  requestId: string;
  logger: Logger;
  prismaTx?: Prisma.TransactionClient;
}
```

Avoid:

```ts
ctx.ledgerService;
ctx.accountService;
ctx.githubService;
```

Services are application dependencies, not request-scoped data.

---

# Service API Design

Prefer:

```ts
ledgerService.create({
  userId,
  input,
});
```

instead of:

```ts
ledgerService.create(ctx);
```

Benefits:

- Service is framework-agnostic
- Easier testing
- Reusable from GraphQL, MCP, CLI, Cron, etc.

---

# Composition Root

Instead of using a DI container everywhere, create all objects in one place.

## Example

```ts
const prisma = new PrismaClient();

const ledgerService = new LedgerService(prisma);

const attachmentService = new AttachmentService(prisma);

const ledgerWorkflow = new LedgerWorkflow(ledgerService, attachmentService);

const ledgerResolver = new LedgerResolver(ledgerWorkflow);
```

This location is called the **Composition Root**.

Benefits:

- Explicit dependency graph
- Easy to understand object relationships
- Simple testing
- No hidden dependencies

---

# Why Not Put Services in Context?

Avoid:

```ts
ctx.services.ledger.create();
```

because Context becomes a Service Locator:

```text
ctx.services.a
ctx.services.b
ctx.services.c
```

This creates hidden dependencies and makes testing harder.

Prefer constructor injection:

```ts
class LedgerResolver {
  constructor(private workflow: LedgerWorkflow) {}
}
```

---

# Testing

Resolver test:

```ts
const workflow = {
  createLedger: vi.fn(),
};

const resolver = new LedgerResolver(workflow as any);
```

Workflow test:

```ts
const ledgerService = {
  create: vi.fn(),
};

const attachmentService = {
  attach: vi.fn(),
};

const workflow = new LedgerWorkflow(
  ledgerService as any,
  attachmentService as any,
);
```

No Apollo server, DI container, or GraphQL context setup required.

---

# Recommendation

- Keep Context request-scoped.
- Use constructor injection.
- Use Composition Root to wire dependencies.
- Allow Resolver → Service for simple CRUD.
- Introduce Workflow when coordinating multiple services.
- Keep Services framework-agnostic and reusable across GraphQL, MCP, CLI, and background jobs.
