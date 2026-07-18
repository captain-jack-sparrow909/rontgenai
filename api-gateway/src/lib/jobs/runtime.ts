import { env } from "../../env.js";

/**
 * Compatibility bridge for local development. Production defaults to the
 * database-backed worker and never starts AI work inside an HTTP process.
 */
export function runInlineJob(task: () => Promise<void>): void {
  if (env.JOB_EXECUTION_MODE !== "inline") return;
  queueMicrotask(() => {
    void task();
  });
}
