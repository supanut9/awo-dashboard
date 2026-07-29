import Link from "next/link";
import { collectionName, getConnection } from "@/lib/db";
import type { EventsDoc, RunDoc, TaskDoc } from "@/lib/types";
import { Crumb, Empty, NeedsFullDetail, OUTCOME_TEXT, Page, Section, Timeline } from "@/lib/ui";
import { Markdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/**
 * The hosted equivalent of the local dashboard's task drawer: the task's definition,
 * its state, and its last run's stream and record.
 */
export default async function TaskPage({
  params,
}: {
  params: Promise<{ workspaceId: string; taskId: string }>;
}) {
  const { workspaceId, taskId } = await params;
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

  const task = await conn.db.collection<TaskDoc>(c("tasks")).findOne({ workspaceId, taskId });
  if (!task) {
    return (
      <Page>
        <Crumb href={`/p/${workspaceId}`}>← project</Crumb>
        <Empty>No task {taskId} in this workspace.</Empty>
      </Page>
    );
  }

  const [detail, runs] = await Promise.all([
    task.lastRunId
      ? conn.db.collection<EventsDoc>(c("events")).findOne({ workspaceId, runId: task.lastRunId })
      : null,
    conn.db
      .collection<RunDoc>(c("runs"))
      .find({ workspaceId, taskId }, { sort: { runId: -1 } })
      .toArray(),
  ]);

  return (
    <Page>
      <Crumb href={`/p/${workspaceId}`}>← project</Crumb>
      <h1 className="mb-1 mt-1.5 text-base font-semibold">
        <code className="font-mono">{task.taskId}</code> {task.name}
      </h1>
      <p className="mb-4 text-xs text-neutral-500">
        {task.status}
        {task.lastRunOutcome ? (
          <>
            {" · last run "}
            <span className={OUTCOME_TEXT[task.lastRunOutcome] ?? ""}>{task.lastRunOutcome}</span>
          </>
        ) : null}
        {task.attempts > 1 ? ` · ${task.attempts} attempts` : ""}
      </p>

      <Section title="Definition">
        {task.body ? <Markdown source={task.body} /> : <NeedsFullDetail what="the task body" />}
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800/60">
          <dt className="text-neutral-500">goal</dt>
          <dd className="font-mono">{task.goalId}</dd>
          <dt className="text-neutral-500">agent</dt>
          <dd>{task.agent ?? "unassigned"}</dd>
          <dt className="text-neutral-500">targets</dt>
          <dd>{task.targets.join(", ") || "none"}</dd>
          <dt className="text-neutral-500">depends on</dt>
          <dd>{task.dependsOn?.join(", ") || "nothing"}</dd>
          {task.file && (
            <>
              <dt className="text-neutral-500">file</dt>
              <dd className="font-mono text-[11px]">{task.file}</dd>
            </>
          )}
          {task.blockedReason && (
            <>
              <dt className="text-neutral-500">blocked</dt>
              <dd className="text-red-600 dark:text-red-400">{task.blockedReason}</dd>
            </>
          )}
        </dl>
      </Section>

      <Section title={task.lastRunId ? `Last run — ${task.lastRunId}` : "Last run"} pad={false}>
        {!task.lastRunId && <Empty>Never run.</Empty>}
        {task.lastRunId && !detail && (
          <div className="p-4">
            <NeedsFullDetail what="this run's events and record" />
          </div>
        )}
        {detail && (
          <div className="px-4 py-2">
            <Timeline events={detail.events} />
            {detail.markdown && (
              <details className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800/60">
                <summary className="cursor-pointer text-[11px] text-indigo-600 dark:text-indigo-400">
                  run record
                </summary>
                <div className="mt-2">
                  <Markdown source={detail.markdown} />
                </div>
              </details>
            )}
          </div>
        )}
      </Section>

      {runs.length > 1 && (
        <Section title={`All ${runs.length} runs of this task`} pad={false}>
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
                      className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400"
                    >
                      {r.runId}
                    </Link>
                  </td>
                  <td className={`px-4 py-2 ${OUTCOME_TEXT[r.status] ?? ""}`}>{r.status}</td>
                  <td className="px-4 py-2 text-right text-neutral-500">
                    {r.durationSec === null ? "—" : `${r.durationSec}s`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </Page>
  );
}
