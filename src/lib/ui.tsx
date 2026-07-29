import Link from "next/link";
import type { ReactNode } from "react";

/** Lifecycle colours, matching the local dashboard so the two read alike. */
export const STATUS_STYLE: Record<string, string> = {
  todo: "border-l-neutral-400",
  queued: "border-l-sky-400",
  running: "border-l-indigo-500",
  blocked: "border-l-red-500",
  "in-review": "border-l-amber-500",
  done: "border-l-emerald-500",
  cancelled: "border-l-neutral-300 opacity-60",
};

export const OUTCOME_TEXT: Record<string, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  failed: "text-red-600 dark:text-red-400",
  skipped: "text-neutral-500",
  running: "text-indigo-600 dark:text-indigo-400",
};

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}

export function Crumb({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400"
    >
      {children}
    </Link>
  );
}

/**
 * Every project page carries this. Without it the run history was reachable only via
 * a small "all N runs" link inside one section, which is the same as not having it —
 * the local dashboard has tabs, so the hosted one needs an equivalent.
 */
export function ProjectNav({
  workspaceId,
  active,
  projectKey,
  projectName,
  version,
  syncedAt,
}: {
  workspaceId: string;
  active: "overview" | "runs";
  projectKey?: string;
  projectName?: string;
  version?: string;
  syncedAt?: string;
}) {
  const tab = (href: string, key: string, label: string): ReactNode => (
    <Link
      href={href}
      className={`rounded px-2.5 py-1 text-xs font-medium ${
        active === key
          ? "bg-neutral-200 dark:bg-neutral-800"
          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <Link href="/" className="text-xs text-neutral-500 hover:text-indigo-600">
        ←
      </Link>
      {projectKey && (
        <span className="rounded bg-indigo-600 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
          {projectKey}
        </span>
      )}
      {projectName && <span className="text-sm font-semibold">{projectName}</span>}
      {version && <span className="text-xs text-neutral-500">awo {version}</span>}

      <nav className="ml-2 flex gap-1">
        {tab(`/p/${workspaceId}`, "overview", "Board")}
        {tab(`/p/${workspaceId}/runs`, "runs", "Runs & logs")}
      </nav>

      {syncedAt && (
        <span className="ml-auto text-[11px] text-neutral-500">
          synced {new Date(syncedAt).toLocaleString()}
        </span>
      )}
    </div>
  );
}

export function Section({
  title,
  right,
  children,
  pad = true,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  pad?: boolean;
}) {
  return (
    <section className="mb-4 rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </h2>
        {right}
      </header>
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, warn }: { label: string; value: ReactNode; warn?: boolean }) {
  return (
    <div className="min-w-28 border-r border-neutral-200 px-4 py-3 last:border-r-0 dark:border-neutral-800">
      <div
        className={`text-xl font-semibold tracking-tight ${warn ? "text-amber-600 dark:text-amber-400" : ""}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="p-8 text-center text-sm text-neutral-500">{children}</div>;
}

/** An event stream, rendered the same way `awo log tail` prints it. */
export function Timeline({
  events,
}: {
  events: { t: string; kind: string; [k: string]: unknown }[];
}) {
  if (events.length === 0) return <Empty>No events recorded for this run.</Empty>;
  const kindColour: Record<string, string> = {
    "run.start": "text-indigo-600 dark:text-indigo-400",
    "run.end": "text-emerald-600 dark:text-emerald-400",
    test: "text-sky-600 dark:text-sky-400",
    "repo.diff": "text-amber-600 dark:text-amber-400",
    commit: "text-violet-600 dark:text-violet-400",
  };
  return (
    <ul className="divide-y divide-dashed divide-neutral-200 dark:divide-neutral-800">
      {events.map((e, i) => {
        const detail = Object.entries(e)
          .filter(([k]) => k !== "t" && k !== "kind")
          .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
          .join("  ");
        return (
          <li key={i} className="flex gap-3 py-1.5 text-xs">
            <span className="shrink-0 font-mono text-neutral-500">{e.t.slice(11, 19)}</span>
            <span className={`w-24 shrink-0 font-semibold ${kindColour[e.kind] ?? ""}`}>
              {e.kind}
            </span>
            <span className="break-all text-neutral-500">{detail}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Says what is missing and how to get it, rather than rendering a blank. */
export function NeedsFullDetail({ what }: { what: string }) {
  return (
    <p className="text-xs leading-relaxed text-neutral-500">
      This workspace publishes summaries, so {what} stayed on the machine that produced
      it. To include it, set{" "}
      <code className="rounded bg-neutral-100 px-1 font-mono dark:bg-neutral-800">
        {`"publish": { "detail": "full" }`}
      </code>{" "}
      in the workspace manifest and publish again. It is not the default because that
      prose describes your code and your prompts.
    </p>
  );
}
