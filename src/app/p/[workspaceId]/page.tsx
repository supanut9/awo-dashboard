import Link from "next/link";
import { collectionName, getConnection } from "@/lib/db";
import type { GoalDoc, ProjectDoc, RunDoc, TaskDoc } from "@/lib/types";
import { Crumb, Empty, OUTCOME_TEXT, Page, ProjectNav, Section, Stat, STATUS_STYLE } from "@/lib/ui";
import { Markdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "queued", "running", "blocked", "in-review", "done", "cancelled"];

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const conn = await getConnection();
  if (!conn) {
    return (
      <Page>
        <Empty>
          No cluster connected. <Link href="/connect">Connect one</Link>.
        </Empty>
      </Page>
    );
  }
  const c = (n: string): string => collectionName(conn.prefix, n);

  const [project, goals, tasks, runs] = await Promise.all([
    conn.db.collection<ProjectDoc>(c("projects")).findOne({ workspaceId }),
    conn.db.collection<GoalDoc>(c("goals")).find({ workspaceId }).toArray(),
    conn.db.collection<TaskDoc>(c("tasks")).find({ workspaceId }).toArray(),
    conn.db
      .collection<RunDoc>(c("runs"))
      .find({ workspaceId }, { sort: { runId: -1 }, limit: 8 })
      .toArray(),
  ]);

  if (!project) {
    return (
      <Page>
        <Crumb href="/">← all projects</Crumb>
        <Empty>No published workspace with that id.</Empty>
      </Page>
    );
  }

  const s = project.stats;
  const pct = s.successRate === null ? "—" : `${Math.round(s.successRate * 100)}%`;
  // §12.9 — prefer the figures awo computed over the FULL history; recomputing from
  // the runs shown here would silently answer a different question.
  const tiers = s.byTier ?? [];

  return (
    <Page>
      <ProjectNav
        workspaceId={workspaceId}
        active="overview"
        projectKey={project.projectKey}
        projectName={project.projectName}
        version={project.libraryVersion}
        syncedAt={project.updatedAt}
      />

      <div className="mb-4 flex flex-wrap overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Stat label="Tasks" value={s.totalTasks} />
        <Stat label="Done" value={s.byStatus.done ?? 0} />
        <Stat label="Blocked" value={s.byStatus.blocked ?? 0} warn={(s.byStatus.blocked ?? 0) > 0} />
        <Stat label="Runs" value={s.totalRuns} />
        <Stat label="Success" value={pct} />
        <Stat label="Avg run" value={s.avgDurationSec === null ? "—" : `${s.avgDurationSec}s`} />
        <Stat
          label="Untested"
          value={s.untestedSuccesses ?? "—"}
          warn={(s.untestedSuccesses ?? 0) > 0}
        />
      </div>

      <Section title="Board" pad={false}>
        {tasks.length === 0 ? (
          <Empty>No tasks published.</Empty>
        ) : (
          <div className="overflow-x-auto p-3.5">
            <div className="grid min-w-[1050px] grid-cols-7 gap-2.5">
              {STATUSES.map((status) => {
                const inCol = tasks.filter((t) => t.status === status);
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      <span>{status}</span>
                      <span>{inCol.length || ""}</span>
                    </div>
                    {inCol.map((t) => (
                      <Link
                        key={t.taskId}
                        href={`/p/${workspaceId}/t/${t.taskId}`}
                        className={`mb-2 block rounded-md border border-l-3 border-neutral-200 bg-neutral-50 p-2.5 transition hover:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-950 ${STATUS_STYLE[t.status] ?? ""}`}
                      >
                        <div className="font-mono text-[11px] font-semibold">{t.taskId}</div>
                        <div className="mt-0.5 text-[11px] leading-snug">{t.name}</div>
                        <div className="mt-1.5 text-[10px] text-neutral-500">
                          {t.agent ?? "unassigned"}
                          {t.attempts > 1 ? ` · ×${t.attempts}` : ""}
                          {t.lastRunOutcome ? (
                            <span className={OUTCOME_TEXT[t.lastRunOutcome] ?? ""}>
                              {" · "}
                              {t.lastRunOutcome}
                            </span>
                          ) : null}
                        </div>
                        {t.blockedReason && (
                          <div className="mt-1 line-clamp-3 text-[10px] text-red-600 dark:text-red-400">
                            {t.blockedReason}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      <Section
        title="Does the tier distinction pay for itself?"
        pad={false}
        right={
          <Crumb href={`/p/${workspaceId}/runs`}>all runs →</Crumb>
        }
      >
        {tiers.length === 0 ? (
          <Empty>No finished runs with a recorded tier yet.</Empty>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-4 py-2 text-left">tier / effort</th>
                  <th className="px-4 py-2 text-right">runs</th>
                  <th className="px-4 py-2 text-right">success</th>
                  <th className="px-4 py-2 text-right">avg attempts</th>
                  <th className="px-4 py-2 text-right">avg</th>
                  <th className="px-4 py-2 text-right">total</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr
                    key={t.key}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                  >
                    <td className="px-4 py-2 font-mono">{t.key}</td>
                    <td className="px-4 py-2 text-right">{t.runs}</td>
                    <td
                      className={`px-4 py-2 text-right ${t.successRate < 0.7 ? "text-red-600 dark:text-red-400" : ""}`}
                    >
                      {Math.round(t.successRate * 100)}%
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${t.avgAttempts > 1.5 ? "text-amber-600 dark:text-amber-400" : ""}`}
                    >
                      {t.avgAttempts.toFixed(1)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {t.avgDurationSec === null ? "—" : `${t.avgDurationSec}s`}
                    </td>
                    <td className="px-4 py-2 text-right">{t.totalDurationSec}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-neutral-200 px-4 py-3 text-[11px] leading-relaxed text-neutral-500 dark:border-neutral-800">
              A lower tier with <strong>more attempts</strong> than a higher one is the cheap
              model giving back what it saved. Attempts count reruns, so environmental
              failures inflate them too — read a high number as &ldquo;look at these
              runs&rdquo;, not as proof about the model.
            </p>
          </>
        )}
      </Section>

      <Section title="Goals">
        {goals.length === 0 && <p className="text-xs text-neutral-500">None published.</p>}
        {goals.map((g) => {
          const own = tasks.filter((t) => t.goalId === g.goalId);
          return (
            <div
              key={g.goalId}
              className="border-t border-neutral-100 py-2.5 first:border-0 first:pt-0 dark:border-neutral-800/60"
            >
              <div className="text-xs">
                <code className="font-mono font-semibold">{g.goalId}</code>{" "}
                <span className="text-neutral-500">{g.status}</span> —{" "}
                {own.filter((t) => t.status === "done").length}/{own.length} done · {g.title}
              </div>
              {g.body && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-[11px] text-indigo-600 dark:text-indigo-400">
                    definition of done
                  </summary>
                  <div className="mt-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
                    <Markdown source={g.body} />
                  </div>
                </details>
              )}
              {g.requirementBody && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-[11px] text-indigo-600 dark:text-indigo-400">
                    requirement it came from
                  </summary>
                  <div className="mt-2 rounded border border-neutral-200 p-3 dark:border-neutral-800">
                    <Markdown source={g.requirementBody} />
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </Section>

      <Section title="Linked repos" pad={false}>
        {project.repos.length === 0 ? (
          <Empty>No repos linked.</Empty>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {project.repos.map((r) => (
                <tr
                  key={r.name}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-2 font-mono">{r.name}</td>
                  <td className="px-4 py-2 text-neutral-500">{r.type}</td>
                  <td
                    className={`px-4 py-2 ${
                      r.status === "missing"
                        ? "text-red-600 dark:text-red-400"
                        : r.status === "dirty"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title="Recent runs"
        pad={false}
        right={<Crumb href={`/p/${workspaceId}/runs`}>all {s.totalRuns} runs & logs →</Crumb>}
      >
        {runs.length === 0 ? (
          <Empty>No runs published.</Empty>
        ) : (
          <table className="w-full text-xs">
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.runId}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/p/${workspaceId}/runs/${encodeURIComponent(r.runId)}`}
                      className="font-mono text-indigo-600 dark:text-indigo-400"
                    >
                      {r.taskId ?? r.agent ?? "adhoc"}
                    </Link>
                  </td>
                  <td className={`px-4 py-2 ${OUTCOME_TEXT[r.status] ?? ""}`}>{r.status}</td>
                  <td className="px-4 py-2 text-neutral-500">
                    {r.tier ?? "—"}
                    {r.effort ? ` / ${r.effort}` : ""}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{r.model ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-neutral-500">
                    {r.durationSec === null ? "—" : `${r.durationSec}s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </Page>
  );
}
