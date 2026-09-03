# Scheduler

Background job scheduling using node-cron. Jobs run in the main Node.js process and start automatically with the server.

## Current Jobs

- **JWT Cleanup** (`jwt-cleanup-job.ts`) - Daily at midnight, deletes expired JWT tokens (PostgreSQL)
- **Dev Test** (`dev-test-job.ts`) - Every 5 minutes in non-production, verifies scheduler functionality

## Architecture

Jobs use the `JobFactory` pattern:

```typescript
export type JobFactory = (service: Service, config: AppConfig) => JobDefinition;

export interface JobDefinition {
  schedule: string; // Cron expression
  task: () => Promise<void>;
}
```

Plaid jobs are also authorization callers. They create a runtime-issued
`PlaidBackgroundPrincipal` with `plaid_scheduler` provenance and invoke the
protected Plaid service boundary. They must not fabricate a session `Identity`,
pass an operation ID into domain methods, or cache item/user/ledger authority.
The service re-resolves the current item binding and ledger relationship before
acquiring its sync lock or performing any mutation. Queued, signature-verified
Plaid events use `plaid_webhook` provenance instead; scheduler provenance cannot
apply item-webhook mutations.

**Parameters:**

- `service` - Models and services: `models`, `sendgrid`, `stripe`, `tierService`
- `config` - Application configuration (env, database, etc.)

## Creating a New Job

**1. Create job file** (`src/scheduler/jobs/my-job.ts`):

```typescript
import { logger } from "@/shared/logger";
import type { JobFactory } from "../types";

const jobLogger = logger.child({ module: "MyJob" });

export const createMyJob: JobFactory = (service, config) => ({
  schedule: "0 * * * *", // Hourly
  task: async () => {
    try {
      await service.models.someModel.cleanup();
      jobLogger.info("Completed", { env: config.env });
    } catch (error) {
      jobLogger.error("Failed", error);
      // Don't rethrow - prevents scheduler crash
    }
  },
});
```

**2. Register** in `job-scheduler.ts`:

```typescript
import { createMyJob } from "./jobs/my-job";

private getJobConfigs(): ScheduledJob[] {
  const myJob = createMyJob(this.service, this.config);
  return [
    { name: "my-job", schedule: myJob.schedule, task: myJob.task, enabled: true },
    // ... other jobs
  ];
}
```

**3. Add tests** (`src/scheduler/jobs/__tests__/my-job.test.ts`):

```typescript
import { createMyJob } from "../my-job";
import type { Service } from "@/service/types";
import type { AppConfig } from "@/config/config";

describe("createMyJob", () => {
  let mockService: Service;
  let mockConfig: AppConfig;

  beforeEach(() => {
    mockService = {
      models: { someModel: { cleanup: jest.fn() } } as any,
      sendgrid: {} as any,
      stripe: {} as any,
      tierService: {} as any,
    } as Service;

    mockConfig = { env: "development" } as AppConfig;
  });

  it("should execute task", async () => {
    const job = createMyJob(mockService, mockConfig);
    await job.task();
    expect(mockService.models.someModel.cleanup).toHaveBeenCalled();
  });
});
```

## Cron Expressions

Format: `minute hour day month weekday`

- `"0 0 * * *"` - Daily at midnight
- `"*/5 * * * *"` - Every 5 minutes
- `"0 */2 * * *"` - Every 2 hours
- `"0 9 * * 1"` - Monday at 9 AM

## Best Practices

- **Error Handling**: Use try-catch, log with `logger.error()`, don't rethrow
- **Logging**: Always use `logger` (never `console.log`)
- **Pattern**: Export as `const createJob: JobFactory = (service, config) => ({...})`
- **Dependencies**: Access models/services via `service`, configuration via `config`
- **Testing**: Mock both `Service` and `AppConfig`, test success and error cases
