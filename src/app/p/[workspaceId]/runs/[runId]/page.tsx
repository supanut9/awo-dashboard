import Link from "next/link";
import { collectionName, getConnection } from "@/lib/db";
import type { EventsDoc, RunDoc } from "@/lib/types";
import { Crumb, Empty, NeedsFullDetail, OUTCOME_TEXT, Page, Section, Timeline , ProjectNav } from "@/lib/ui";
import { Markdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

/** The hosted equivalent of `awo log show <runId>`: the index line, the event stream, and the record. */
export default async function RunPage({
  params,
}: {
  params: Promise<{ workspaceId: string; runId: string }>;
}) {
  const { workspaceId, runId: raw } = await params;
  const runId = decodeURIComponent(raw);
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

  const [run, detail] = await Promise.all([
    conn.db.collection<RunDoc>(c("runs")).findOne({ workspaceId, runId }),
    conn.db.collection<EventsDoc>(c("events")).findOne({ workspaceId, runId }),
  ]);

  if (!run) {
    return (
      <Page>
        <ProjectNav workspaceId={workspaceId} active="runs" />
        <Empty>No run {runId} in this workspace.</Empty>
      </Page>
    );
  }

  return (
    <Page>
      <ProjectNav workspaceId={workspaceId} active="runs" />
      <h1 className="mb-1 mt-1.5 font-mono text-sm font-semibold">{run.runId}</h1>
      <p className="mb-4 text-xs text-neutral-500">
        <span className={OUTCOME_TEXT[run.status] ?? ""}>{run.status}</span>
        {run.taskId && (
          <>
            {" · "}
            <Link
              href={`/p/${workspaceId}/t/${run.taskId}`}
              className="text-indigo-600 dark:text-indigo-400"
            >
              {run.taskId}
            </Link>
          </>
        )}
        {run.agent ? ` · ${run.agent}` : ""}
        {run.tier ? ` · ${run.tier}${run.effort ? `/${run.effort}` : ""}` : ""}
        {run.model ? ` · ${run.model}` : ""}
        {(run.attempts ?? 1) > 1 ? ` · attempt ${run.attempts}` : ""}
        {run.durationSec !== null ? ` · ${run.durationSec}s` : ""}
        {run.reposChanged.length > 0 ? ` · ${run.reposChanged.join(", ")}` : ""}
      </p>

      <Section title="Event stream" pad={false}>
        {detail ? (
          <div className="px-4 py-2">
            <Timeline events={detail.events} />
          </div>
        ) : (
          <div className="p-4">
            <NeedsFullDetail what="this run's event stream" />
          </div>
        )}
      </Section>

      {detail?.workerLog && (
        <Section title="Worker output" pad={false}>
          <pre className="max-h-[32rem] overflow-auto px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
            {detail.workerLog}
          </pre>
        </Section>
      )}

      <Section title="Run record">
        {detail?.markdown ? (
          <Markdown source={detail.markdown} />
        ) : (
          <NeedsFullDetail what="this run's written record" />
        )}
      </Section>
    </Page>
  );
}
