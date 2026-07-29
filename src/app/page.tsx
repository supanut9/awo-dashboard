import Link from "next/link";
import { collectionName, getConnectionResult } from "@/lib/db";
import type { ProjectDoc } from "@/lib/types";
import { Crumb, Empty, Page, ConnectionProblem } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Resolved before the try, so the failure reason is in scope for the JSX below —
  // getConnectionResult never throws, it returns the reason.
  const result = await getConnectionResult();
  let rows: ProjectDoc[] = [];
  let error: string | null = null;

  if (result.ok) {
    try {
      rows = await result.connection.db
        .collection<ProjectDoc>(collectionName(result.connection.prefix, "projects"))
        .find({}, { sort: { updatedAt: -1 } })
        .toArray();
    } catch (e) {
      // Connected but the query failed — usually a read-only user without access to
      // this database, which is a different problem from not connecting at all.
      error = (e as Error).message;
    }
  }

  return (
    <Page>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-base font-semibold">awo dashboard</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Workspaces that have run <code className="font-mono">awo publish</code>.
            Read-only — the workspace on disk stays canonical.
          </p>
        </div>
        <Crumb href="/connect">cluster settings →</Crumb>
      </div>

      {error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      {!result.ok && <ConnectionProblem failure={result} />}

      {result.ok && !error && rows.length === 0 && (
        <Empty>
          Connected, but nothing published yet. In a workspace, put{" "}
          <code className="font-mono">MONGO_URI</code> in{" "}
          <code className="font-mono">.workspace/credentials/mongo.env</code> and run{" "}
          <code className="font-mono">awo publish</code>.
        </Empty>
      )}

      <div className="grid gap-2.5">
        {rows.map((p) => {
          const pct = p.stats.successRate === null ? "—" : `${Math.round(p.stats.successRate * 100)}%`;
          const blocked = p.stats.byStatus.blocked ?? 0;
          return (
            <Link
              key={p.workspaceId}
              href={`/p/${p.workspaceId}`}
              className="block rounded-lg border border-neutral-200 bg-white p-3.5 transition hover:border-indigo-400 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="rounded bg-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                  {p.projectKey}
                </span>
                <strong className="text-sm">{p.projectName}</strong>
                <span className="text-xs text-neutral-500">awo {p.libraryVersion}</span>
                <span className="ml-auto text-[11px] text-neutral-500">
                  synced {new Date(p.updatedAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
                <span>{p.stats.totalTasks} tasks</span>
                <span>{p.stats.byStatus.done ?? 0} done</span>
                {blocked > 0 && (
                  <span className="text-red-600 dark:text-red-400">{blocked} blocked</span>
                )}
                <span>{p.stats.totalRuns} runs</span>
                <span>{pct} success</span>
                <span>{p.repos.length} repos</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Page>
  );
}
