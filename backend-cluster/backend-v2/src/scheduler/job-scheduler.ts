import cron, { type ScheduledTask } from "node-cron";
import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";
import { logger } from "@/shared/logger";
import { createJwtCleanupJob } from "./jobs/jwt-cleanup-job";
import { createAuditRetentionJob } from "./jobs/audit-retention-job";
import { createOauthAdapterCleanupJob } from "./jobs/oauth-adapter-cleanup-job";
import { createDevTestJob } from "./jobs/dev-test-job";
import { createPlaidSyncJob } from "./jobs/plaid-sync-job";
import { createPlaidWebhookProcessorJob } from "./jobs/plaid-webhook-processor-job";
import { createPlaidWebhookCleanupJob } from "./jobs/plaid-webhook-cleanup-job";
import { createLedgerPasswordRotationJob } from "./jobs/ledger-password-rotation-job";

const jobLogger = logger.child({ module: "job-scheduler" });

export interface ScheduledJob {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  enabled: boolean;
}

export class JobScheduler {
  private jobs: Map<string, ScheduledTask> = new Map();

  constructor(
    private layers: AppLayers,
    private config: AppConfig,
  ) {}

  public start(): void {
    const jobConfigs = this.getJobConfigs();

    for (const jobConfig of jobConfigs) {
      if (!jobConfig.enabled) {
        jobLogger.info(`Skipping disabled job: ${jobConfig.name}`);
        continue;
      }

      const cronJob = cron.schedule(jobConfig.schedule, async () => {
        try {
          await jobConfig.task();
        } catch (error) {
          jobLogger.error(`Job failed: ${jobConfig.name}`, error);
        }
      });

      this.jobs.set(jobConfig.name, cronJob);
      jobLogger.info(`Started job: ${jobConfig.name} (${jobConfig.schedule})`);
    }
  }

  public stop(): void {
    for (const [name, job] of this.jobs.entries()) {
      job.stop();
      jobLogger.info(`Stopped job: ${name}`);
    }
    this.jobs.clear();
  }

  private getJobConfigs(): ScheduledJob[] {
    const devTest = createDevTestJob(this.layers, this.config);
    const jwtCleanup = createJwtCleanupJob(this.layers, this.config);
    const auditRetention = createAuditRetentionJob(this.layers, this.config);
    const oauthAdapterCleanup = createOauthAdapterCleanupJob(
      this.layers,
      this.config,
    );
    const plaidSync = createPlaidSyncJob(this.layers, this.config);
    const plaidWebhookProcessor = createPlaidWebhookProcessorJob(
      this.layers,
      this.config,
    );
    const plaidWebhookCleanup = createPlaidWebhookCleanupJob(
      this.layers,
      this.config,
    );
    const ledgerPasswordRotation = createLedgerPasswordRotationJob(
      this.layers,
      this.config,
    );
    const jobs: ScheduledJob[] = [
      {
        name: "dev-test",
        schedule: devTest.schedule,
        task: devTest.task,
        enabled: this.config.env !== "production", // Dev/test only
      },
      {
        name: "audit-retention",
        schedule: auditRetention.schedule,
        task: auditRetention.task,
        enabled: true, // 90-day audit retention sweep
      },
      {
        name: "jwt-cleanup",
        schedule: jwtCleanup.schedule,
        task: jwtCleanup.task,
        enabled: true, // PostgreSQL-backed cleanup
      },
      {
        name: "ledger-password-rotation",
        schedule: ledgerPasswordRotation.schedule,
        task: ledgerPasswordRotation.task,
        enabled: true,
      },
      {
        name: "oauth-adapter-cleanup",
        schedule: oauthAdapterCleanup.schedule,
        task: oauthAdapterCleanup.task,
        enabled: true, // Sweeps expired OAuth sessions/tokens/codes daily
      },
      {
        name: "plaid-sync",
        schedule: plaidSync.schedule,
        task: plaidSync.task,
        enabled: false, // Sync Plaid transactions every 6 hours
      },
      {
        name: "plaid-webhook-processor",
        schedule: plaidWebhookProcessor.schedule,
        task: plaidWebhookProcessor.task,
        enabled: true, // Process queued webhook events every 2 minutes
      },
      {
        name: "plaid-webhook-cleanup",
        schedule: plaidWebhookCleanup.schedule,
        task: plaidWebhookCleanup.task,
        enabled: true, // Clean up old completed webhook events daily at 2 AM
      },
    ];

    return jobs;
  }
}
