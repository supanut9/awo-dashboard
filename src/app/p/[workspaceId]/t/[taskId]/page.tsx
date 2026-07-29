import Link from "next/link";
import { collectionName, getConnection } from "@/lib/db";
import type { EventsDoc, TaskDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * The hosted equivalent of the local dashboard's task drawer: the task's own
 * definition, its state, and the event stream plus markdown record of its last run.
 *
 * All of that exists only when the workspace publishes with `detail: "full"`. When it
 * does not, this page says so rather than rendering blanks — a page that looks empty
 * is indistinguishable from a task that did nothing.
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
      <Shell workspaceId={workspaceId}>
        <p style={{ fontSize: 13 }}>
          No cluster connected. <a href="/connect">Connect one</a>.
        </p>
      </Shell>
    );
  }

  const task = await conn.db
    .collection<TaskDoc>(collectionName(conn.prefix, "tasks"))
    .findOne({ workspaceId, taskId });

  if (!task) {
    return (
      <Shell workspaceId={workspaceId}>
        <p style={{ fontSize: 13 }}>No task {taskId} in this workspace.</p>
      </Shell>
    );
  }

  const run = task.lastRunId
    ? await conn.db
        .collection<EventsDoc>(collectionName(conn.prefix, "events"))
        .findOne({ workspaceId, runId: task.lastRunId })
    : null;

  return (
    <Shell workspaceId={workspaceId}>
      <h1 style={{ fontSize: 17, margin: "8px 0 2px" }}>
        <code>{task.taskId}</code> {task.name}
      </h1>
      <p style={{ color: "#6f6f68", fontSize: 12, margin: "0 0 16px" }}>
        {task.status}
        {task.lastRunOutcome ? ` · last run ${task.lastRunOutcome}` : ""}
        {task.attempts > 1 ? ` · ${task.attempts} attempts` : ""}
      </p>

      <Section title="Definition">
        {task.body ? (
          <pre style={pre}>{task.body}</pre>
        ) : (
          <Missing what="the task body" />
        )}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12, margin: "12px 0 0" }}>
          <dt style={dt}>goal</dt>
          <dd style={dd}>{task.goalId}</dd>
          <dt style={dt}>agent</dt>
          <dd style={dd}>{task.agent ?? "unassigned"}</dd>
          <dt style={dt}>targets</dt>
          <dd style={dd}>{task.targets.join(", ") || "none"}</dd>
          <dt style={dt}>depends on</dt>
          <dd style={dd}>{task.dependsOn?.join(", ") || "nothing"}</dd>
          {task.file && (
            <>
              <dt style={dt}>file</dt>
              <dd style={{ ...dd, fontFamily: "ui-monospace, Menlo, monospace" }}>{task.file}</dd>
            </>
          )}
          {task.blockedReason && (
            <>
              <dt style={dt}>blocked</dt>
              <dd style={{ ...dd, color: "#c0392b" }}>{task.blockedReason}</dd>
            </>
          )}
        </dl>
      </Section>

      <Section title={`Last run${task.lastRunId ? ` — ${task.lastRunId}` : ""}`}>
        {!task.lastRunId && <p style={{ fontSize: 12.5, color: "#6f6f68" }}>Never run.</p>}
        {task.lastRunId && !run && <Missing what="this run's events and record" />}
        {run && (
          <>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {run.events.map((e, i) => {
                const detail = Object.entries(e)
                  .filter(([k]) => k !== "t" && k !== "kind")
                  .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
                  .join("  ");
                return (
                  <li
                    key={i}
                    style={{ display: "flex", gap: 12, padding: "4px 0", borderBottom: "1px dashed #eee", fontSize: 12 }}
                  >
                    <span style={{ color: "#6f6f68", fontFamily: "ui-monospace, Menlo, monospace" }}>
                      {e.t.slice(11, 19)}
                    </span>
                    <span style={{ minWidth: 90, fontWeight: 600 }}>{e.kind}</span>
                    <span style={{ color: "#6f6f68", wordBreak: "break-word" }}>{detail}</span>
                  </li>
                );
              })}
            </ul>
            {run.markdown && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: "pointer", fontSize: 12, color: "#3b5bdb" }}>
                  run record
                </summary>
                <pre style={pre}>{run.markdown}</pre>
              </details>
            )}
          </>
        )}
      </Section>
    </Shell>
  );
}

function Missing({ what }: { what: string }) {
  return (
    <p style={{ fontSize: 12.5, color: "#6f6f68" }}>
      This workspace publishes summaries only, so {what} stayed on the machine that
      produced it. To include it, set{" "}
      <code>{`"publish": { "detail": "full" }`}</code> in the workspace manifest —
      that sends prose describing the code and the prompts, which is why it is not the
      default.
    </p>
  );
}

function Shell({ workspaceId, children }: { workspaceId: string; children: React.ReactNode }) {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>
      <Link href={`/p/${workspaceId}`} style={{ fontSize: 12, color: "#6f6f68" }}>
        ← project
      </Link>
      {children}
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #e4e4e1", borderRadius: 8, background: "#fff", marginBottom: 16 }}>
      <h2
        style={{
          margin: 0,
          padding: "10px 14px",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          color: "#6f6f68",
          borderBottom: "1px solid #e4e4e1",
        }}
      >
        {title}
      </h2>
      <div style={{ padding: 14 }}>{children}</div>
    </section>
  );
}

const pre = {
  margin: 0,
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-word" as const,
  fontSize: 12,
  lineHeight: 1.55,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};
const dt = { color: "#6f6f68" } as const;
const dd = { margin: 0 } as const;
