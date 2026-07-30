import Link from "next/link";
import { collectionName, getConnectionResult } from "@/lib/db";
import type { GoalDoc, ProjectDoc, RequirementDoc, RunDoc, TaskDoc } from "@/lib/types";
import { Crumb, Empty, OUTCOME_TEXT, Page, ProjectNav, REQUIREMENT_STYLE, Section, Stat, STATUS_STYLE, ConnectionProblem } from "@/lib/ui";
import { Markdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "queued", "running", "blocked", "in-review", "done", "cancelled"];

function TaskBoard({ workspaceId, tasks }: { workspaceId: string; tasks: TaskDoc[] }) {
  return (
    <div className="overflow-x-auto px-3.5 pb-3.5">
      <div className="grid min-w-[1050px] grid-cols-7 gap-2.5">
        {STATUSES.map((status) => {
          const inColumn = tasks.filter((task) => task.status === status);
          return (
            <div key={status}>
              <div className="mb-1.5 flex justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                <span>{status}</span>
                <span>{inColumn.length || ""}</span>
              </div>
              {inColumn.map((task) => (
                <Link
                  key={task.taskId}
                  href={`/p/${workspaceId}/t/${task.taskId}`}
                  className={`mb-2 block rounded-md border border-l-3 border-neutral-200 bg-neutral-50 p-2.5 transition hover:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-950 ${STATUS_STYLE[task.status] ?? ""}`}
                >
                  <div className="font-mono text-[11px] font-semibold">{task.taskId}</div>
                  <div className="mt-0.5 text-[11px] leading-snug">{task.name}</div>
                  <div className="mt-1.5 text-[10px] text-neutral-500">
                    {task.agent ?? "unassigned"}
                    {task.attempts > 1 ? ` · ×${task.attempts}` : ""}
                    {task.lastRunOutcome ? (
                      <span className={OUTCOME_TEXT[task.lastRunOutcome] ?? ""}>
                        {" · "}
                        {task.lastRunOutcome}
                      </span>
                    ) : null}
                  </div>
                  {task.blockedReason && (
                    <div className="mt-1 line-clamp-3 text-[10px] text-red-600 dark:text-red-400">
                      {task.blockedReason}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const result = await getConnectionResult();
  if (!result.ok) {
    return (
      <Page>
        <ConnectionProblem failure={result} />
      </Page>
    );
  }
  const conn = result.connection;
  const c = (n: string): string => collectionName(conn.prefix, n);

  const [project, requirements, goals, tasks, runs] = await Promise.all([
    conn.db.collection<ProjectDoc>(c("projects")).findOne({ workspaceId }),
    conn.db.collection<RequirementDoc>(c("requirements")).find({ workspaceId }).toArray(),
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
        <Stat label="Requirements" value={requirements.length} />
        <Stat label="Need approval" value={requirements.filter((r) => r.status === "proposed").length} warn={requirements.some((r) => r.status === "proposed")} />
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

      <Section title="Requirement intake" pad={false} right={<Crumb href={`/p/${workspaceId}/requirements`}>all requirements →</Crumb>}>
        {requirements.length === 0 ? (
          <Empty>No requirements in this projection yet. Run the current version of <code className="font-mono">awo publish</code> to add them.</Empty>
        ) : (
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {requirements.slice(0, 6).map((r) => (
              <div key={r.requirementId} className={`rounded-md border border-l-3 border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950 ${REQUIREMENT_STYLE[r.status] ?? ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <code className="font-mono text-[11px] font-semibold">{r.requirementId}</code>
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">{r.status}</span>
                </div>
                <p className="mt-1 text-xs font-medium leading-snug">{r.title}</p>
                <p className="mt-2 text-[11px] text-neutral-500">
                  {r.criteria.covered}/{r.criteria.total} criteria covered
                  {r.criteria.exceptions > 0 ? ` · ${r.criteria.exceptions} exception${r.criteria.exceptions === 1 ? "" : "s"}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Goal boards" pad={false}>
        {tasks.length === 0 ? (
          <Empty>No tasks published.</Empty>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-neutral-800">
            {goals.map((goal) => {
              const own = tasks.filter((task) => task.goalId === goal.goalId);
              const done = own.filter((task) => task.status === "done").length;
              return (
                <article key={goal.goalId} className="py-4 first:pt-3 last:pb-3">
                  <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-3">
                    <code className="font-mono text-[11px] font-semibold">{goal.goalId}</code>
                    <span className="text-[10px] uppercase tracking-wide text-neutral-500">{goal.status}</span>
                    <h3 className="basis-full text-sm font-semibold sm:basis-auto">{goal.title}</h3>
                    <span className="text-[11px] text-neutral-500 sm:ml-auto">{done}/{own.length} done</span>
                  </header>
                  {own.length > 0 ? (
                    <TaskBoard workspaceId={workspaceId} tasks={own} />
                  ) : (
                    <p className="px-4 pb-1 text-xs text-neutral-500">No tasks published for this goal.</p>
                  )}
                </article>
              );
            })}
            {tasks.some((task) => !goals.some((goal) => goal.goalId === task.goalId)) && (
              <article className="py-4 last:pb-3">
                <header className="px-4 pb-3">
                  <h3 className="text-sm font-semibold">Unassigned tasks</h3>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                    These tasks reference a goal that was not published.
                  </p>
                </header>
                <TaskBoard
                  workspaceId={workspaceId}
                  tasks={tasks.filter((task) => !goals.some((goal) => goal.goalId === task.goalId))}
                />
              </article>
            )}
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
