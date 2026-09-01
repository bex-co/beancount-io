import type { AppLayers } from "@/foundation/composition";
import type { AppConfig } from "@/config/config";

interface JobDefinition {
  schedule: string;
  task: () => Promise<void>;
}

/**
 * Job factory function type that accepts AppLayers and AppConfig
 * and returns a JobDefinition with schedule and task.
 *
 * @example
 * ```typescript
 * export const createMyJob: JobFactory = (layers, config) => ({
 *   schedule: "0 0 * * *",
 *   task: async () => {
 *     await layers.database.models.someModel.cleanup();
 *     logger.debug("Job completed", { env: config.env });
 *   },
 * });
 * ```
 */
export type JobFactory = (
  layers: AppLayers,
  config: AppConfig,
) => JobDefinition;
