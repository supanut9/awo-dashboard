/** Mirrors what `awo publish` writes (§7.6). Kept deliberately narrow: the
 *  projection carries statuses and counts, never prose about private code. */
export interface ProjectDoc {
  workspaceId: string;
  projectKey: string;
  projectName: string;
  libraryVersion: string;
  repos: { name: string; type: string; status: string }[];
  stats: {
    byStatus: Record<string, number>;
    totalTasks: number;
    totalRuns: number;
    successRate: number | null;
    avgDurationSec: number | null;
    openRuns: number;
    /** Successes that carried no test evidence — exemptions someone chose. */
    untestedSuccesses?: number;
    /** §12.9 — outcomes grouped by tier/effort, computed locally and published. */
    byTier?: TierStat[];
  };
  updatedAt: string;
}

export interface TierStat {
  key: string;
  tier: string;
  effort: string | null;
  runs: number;
  succeeded: number;
  successRate: number;
  avgAttempts: number;
  avgDurationSec: number | null;
  totalDurationSec: number;
}

export interface GoalDoc {
  workspaceId: string;
  goalId: string;
  title: string;
  status: string;
  taskIds: string[];
  /** Only present when the workspace publishes with detail: "full". */
  body?: string;
  requirementBody?: string;
}

export interface TaskDoc {
  workspaceId: string;
  goalId: string;
  taskId: string;
  name: string;
  status: string;
  agent: string | null;
  targets: string[];
  lastRunOutcome: string | null;
  attempts: number;
  blockedReason: string | null;
  lastRunId?: string | null;
  /** detail: "full" only — the task's objective/steps/done-when. */
  body?: string;
  dependsOn?: string[];
  file?: string;
}

/** detail: "full" only — one per run: its event stream and markdown record. */
export interface EventsDoc {
  workspaceId: string;
  runId: string;
  taskId: string | null;
  events: { t: string; kind: string; [k: string]: unknown }[];
  markdown: string;
}

export interface RunDoc {
  workspaceId: string;
  runId: string;
  taskId: string | null;
  agent: string | null;
  tier: string | null;
  model: string | null;
  effort: string | null;
  attempts: number | null;
  status: string;
  startedAt: string;
  durationSec: number | null;
  reposChanged: string[];
}
