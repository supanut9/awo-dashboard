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

export const REQUIREMENT_STYLE: Record<string, string> = {
  draft: "border-l-neutral-400",
  proposed: "border-l-amber-500",
  approved: "border-l-sky-500",
  rejected: "border-l-red-500 opacity-75",
};

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent text-slate-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7">{children}</main>
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
  active: "overview" | "requirements" | "runs";
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
        {tab(`/p/${workspaceId}/requirements`, "requirements", "Requirements")}
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

/**
 * What to show when there is no working connection.
 *
 * The driver's own words for a blocked IP are an OpenSSL record-layer error, which
 * tells a viewer nothing and sends them checking their password. So the cause is named
 * and the fix is spelled out, with the raw text kept behind a disclosure for when it
 * really is something else.
 */
export function ConnectionProblem({
  failure,
}: {
  failure:
    | { reason: "none" }
    | { reason: "malformed" }
    | { reason: "unreachable"; likely: string; detail: string };
}) {
  if (failure.reason === "none") {
    return (
      <Empty>
        No cluster connected. <Link href="/connect">Connect one</Link>.
      </Empty>
    );
  }
  if (failure.reason === "malformed") {
    return (
      <Empty>
        The stored connection is not a valid MongoDB URI.{" "}
        <Link href="/connect">Enter it again</Link>.
      </Empty>
    );
  }

  const blockedIp = /access list/i.test(failure.likely);
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
      <p className="font-medium">Could not reach that cluster.</p>
      <p className="mt-1">{failure.likely}</p>

      {blockedIp && (
        <div className="mt-3 border-t border-amber-300/70 pt-2 dark:border-amber-900/60">
          <p className="font-medium">To fix it in Atlas</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>Network Access → IP Access List → Add IP Address</li>
            <li>
              For your own machine: <em>Add Current IP Address</em>
            </li>
            <li>
              For this deployment: serverless egress IPs are not fixed, so it needs{" "}
              <code className="font-mono">0.0.0.0/0</code> — which is only acceptable with a{" "}
              <strong>read-only user scoped to this one database</strong>
            </li>
          </ol>
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] opacity-80">
          the driver&apos;s own words
        </summary>
        <pre className="mt-1 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap opacity-80">
          {failure.detail}
        </pre>
      </details>

      <p className="mt-3">
        <Link href="/connect" className="underline">
          Change the connection
        </Link>
      </p>
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
    <section className="mb-4 overflow-hidden rounded-xl border border-white/80 bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 dark:border-neutral-800">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
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
    <div className="min-w-28 border-r border-slate-200/80 px-4 py-3 last:border-r-0 dark:border-neutral-800">
      <div
        className={`text-xl font-semibold tracking-tight ${warn ? "text-amber-600 dark:text-amber-400" : ""}`}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-500">{label}</div>
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
        // `label` is prose and carries the meaning, so it gets the room. Everything
        // else is structured — a test event's per-suite results, a commit's sha — and
        // reads far better as chips than as one run-together k=v string.
        const { t, kind, label, repo, ...rest } = e;
        return (
          <li key={i} className="flex gap-3 py-2 text-xs">
            <span className="shrink-0 font-mono text-neutral-500">{t.slice(11, 19)}</span>
            <span className={`w-20 shrink-0 font-semibold ${kindColour[kind] ?? ""}`}>{kind}</span>
            <div className="min-w-0 flex-1">
              {typeof label === "string" && <div className="break-words">{label}</div>}
              {(repo !== undefined || Object.keys(rest).length > 0) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {repo !== undefined && (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                      {String(repo)}
                    </span>
                  )}
                  {Object.entries(rest).map(([k, v]) => {
                    const text = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);
                    const good = /^(pass(ed)?|true|ok|clean)$/i.test(text);
                    const bad = /^(fail(ed)?|false|error|dirty)$/i.test(text);
                    return (
                      <span
                        key={k}
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          good
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : bad
                              ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        <span className="opacity-60">{k}</span> {text}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
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
