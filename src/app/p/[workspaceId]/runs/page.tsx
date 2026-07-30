import Link from "next/link";
import { collectionName, getConnectionResult } from "@/lib/db";
import type { RunDoc } from "@/lib/types";
import { Crumb, Empty, OUTCOME_TEXT, Page, Section , ProjectNav, ConnectionProblem } from "@/lib/ui";

export const dynamic = "force-dynamic";

/**
 * The hosted equivalent of `awo log list` — the whole audit trail, not the eight most
 * recent. Filters mirror the CLI's flags (status, tier, effort, task) because the
 * questions are the same ones: which tier fails, which task keeps being retried.
 */
export default async function RunsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ status?: string; tier?: string; effort?: string; task?: string }>;
}) {
  const { workspaceId } = await params;
  const filters = await searchParams;
  const result = await getConnectionResult();
  if (!result.ok) {
    return (
      <Page>
        <ConnectionProblem failure={result} />
      </Page>
    );
  }
  const conn = result.connection;

  const query: Record<string, unknown> = { workspaceId };
  if (filters.status) query.status = filters.status;
  if (filters.tier) query.tier = filters.tier;
  if (filters.effort) query.effort = filters.effort;
  if (filters.task) query.taskId = filters.task;

  const runs = await conn.db
    .collection<RunDoc>(collectionName(conn.prefix, "runs"))
    .find(query, { sort: { runId: -1 }, limit: 500 })
    .toArray();

  const all = await conn.db
    .collection<RunDoc>(collectionName(conn.prefix, "runs"))
    .find({ workspaceId }, { projection: { status: 1, tier: 1, effort: 1 } })
    .toArray();

  const distinct = (key: "status" | "tier" | "effort"): string[] =>
    [...new Set(all.map((r) => r[key]).filter((v): v is string => Boolean(v)))].sort();

  const chip = (key: string, value: string | null, label: string): React.ReactNode => {
    const next = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v) as [string, string][]
    );
    if (value === null) next.delete(key);
    else next.set(key, value);
    const active = value !== null && filters[key as keyof typeof filters] === value;
    const none = value === null && !filters[key as keyof typeof filters];
    return (
      <Link
        key={`${key}-${value ?? "any"}`}
        href={`/p/${workspaceId}/runs${next.toString() ? `?${next}` : ""}`}
        className={`rounded border px-2 py-0.5 text-[11px] ${
          active || none
            ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
            : "border-neutral-300 text-neutral-500 hover:border-indigo-400 dark:border-neutral-700"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <Page>
      <ProjectNav workspaceId={workspaceId} active="runs" />
      <h1 className="mb-1 mt-1.5 text-base font-semibold">Runs</h1>
      <p className="mb-4 text-xs text-neutral-500">
        Every run, newest first — the same history <code className="font-mono">awo log list</code>{" "}
        reads. {runs.length} shown{runs.length === 500 ? " (capped)" : ""}.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-wide text-neutral-500">outcome</span>
        {chip("status", null, "any")}
        {distinct("status").map((v) => chip("status", v, v))}
        <span className="ml-3 mr-1 text-[10px] uppercase tracking-wide text-neutral-500">tier</span>
        {chip("tier", null, "any")}
        {distinct("tier").map((v) => chip("tier", v, v))}
        {distinct("effort").length > 0 && (
          <>
            <span className="ml-3 mr-1 text-[10px] uppercase tracking-wide text-neutral-500">
              effort
            </span>
            {chip("effort", null, "any")}
            {distinct("effort").map((v) => chip("effort", v, v))}
          </>
        )}
      </div>

      <Section title="History" pad={false}>
        {runs.length === 0 ? (
          <Empty>Nothing matches those filters.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wide text-neutral-500">
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-4 py-2 text-left">when</th>
                  <th className="px-4 py-2 text-left">task / agent</th>
                  <th className="px-4 py-2 text-left">outcome</th>
                  <th className="px-4 py-2 text-left">tier</th>
                  <th className="px-4 py-2 text-left">model</th>
                  <th className="px-4 py-2 text-right">try</th>
                  <th className="px-4 py-2 text-right">took</th>
                  <th className="px-4 py-2 text-left">repos</th>
                  <th className="px-4 py-2 text-right">log</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.runId}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-4 py-2 whitespace-nowrap text-neutral-500">
                      {new Date(r.startedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono">{r.taskId ?? r.agent ?? "adhoc"}</span>
                    </td>
                    <td className={`px-4 py-2 ${OUTCOME_TEXT[r.status] ?? ""}`}>{r.status}</td>
                    <td className="px-4 py-2 text-neutral-500">
                      {r.tier ?? "—"}
                      {r.effort ? ` / ${r.effort}` : ""}
                    </td>
                    <td className="px-4 py-2 font-mono text-[11px] text-neutral-500">
                      {r.model ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right ${(r.attempts ?? 1) > 1 ? "text-amber-600 dark:text-amber-400" : "text-neutral-500"}`}
                    >
                      {r.attempts ?? 1}
                    </td>
                    <td className="px-4 py-2 text-right text-neutral-500">
                      {r.durationSec === null ? "—" : `${r.durationSec}s`}
                    </td>
                    <td className="px-4 py-2 text-neutral-500">
                      {r.reposChanged.join(", ") || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/p/${workspaceId}/runs/${encodeURIComponent(r.runId)}`}
                        className="inline-flex rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-medium text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
                        aria-label={`View log for ${r.runId}`}
                      >
                        View log
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </Page>
  );
}
