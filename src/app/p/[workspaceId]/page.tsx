import Link from "next/link";
import { collectionName, getConnection } from "@/lib/db";
import type { GoalDoc, ProjectDoc, RunDoc, TaskDoc } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES = ["todo", "queued", "running", "blocked", "in-review", "done", "cancelled"];

const ACCENT: Record<string, string> = {
  todo: "#8a8a82",
  queued: "#3b82f6",
  running: "#3b5bdb",
  blocked: "#c0392b",
  "in-review": "#b06d00",
  done: "#2f8f4e",
  cancelled: "#c8c8c2",
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const conn = await getConnection();
  if (!conn) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <p style={{ fontSize: 13 }}>
          No cluster connected. <a href="/connect">Connect one</a>.
        </p>
      </main>
    );
  }
  const c = (n: string): string => collectionName(conn.prefix, n);

  const [project, goals, tasks, runs] = await Promise.all([
    conn.db.collection<ProjectDoc>(c("projects")).findOne({ workspaceId }),
    conn.db.collection<GoalDoc>(c("goals")).find({ workspaceId }).toArray(),
    conn.db.collection<TaskDoc>(c("tasks")).find({ workspaceId }).toArray(),
    conn.db
      .collection<RunDoc>(c("runs"))
      .find({ workspaceId }, { sort: { runId: -1 }, limit: 20 })
      .toArray(),
  ]);

  if (!project) {
    return (
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
        <Link href="/">← all projects</Link>
        <p style={{ color: "#6f6f68" }}>No published workspace with that id.</p>
      </main>
    );
  }

  // §12.9 — prefer the figures awo computed over the FULL history. Recomputing
  // from the 20 runs shown here would silently answer a different question.
  const published = project.stats.byTier;
  const rows =
    published && published.length > 0
      ? published.map((t) => ({
          key: t.key,
          total: t.runs,
          ok: t.succeeded,
          attempts: t.avgAttempts * t.runs,
        }))
      : [...runs
          .reduce((m, r) => {
            const key = `${r.tier ?? "—"}${r.effort ? ` / ${r.effort}` : ""}`;
            const acc = m.get(key) ?? { total: 0, ok: 0, attempts: 0 };
            acc.total += 1;
            if (r.status === "success") acc.ok += 1;
            acc.attempts += r.attempts ?? 1;
            m.set(key, acc);
            return m;
          }, new Map<string, { total: number; ok: number; attempts: number }>())
          .entries()].map(([key, v]) => ({ key, ...v }));

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <Link href="/" style={{ fontSize: 12, color: "#6f6f68" }}>
        ← all projects
      </Link>
      <h1 style={{ fontSize: 18, margin: "8px 0 2px" }}>
        {project.projectKey} · {project.projectName}
      </h1>
      <p style={{ color: "#6f6f68", fontSize: 12, margin: "0 0 18px" }}>
        awo {project.libraryVersion} · published {new Date(project.updatedAt).toLocaleString()}
      </p>

      <Section title="Board">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, 1fr)`, gap: 8, minWidth: 900 }}>
          {STATUSES.map((s) => {
            const inCol = tasks.filter((t) => t.status === s);
            return (
              <div key={s}>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6f6f68", marginBottom: 6 }}>
                  {s} {inCol.length || ""}
                </div>
                {inCol.map((t) => (
                  <div
                    key={t.taskId}
                    style={{
                      border: "1px solid #e4e4e1",
                      borderLeft: `3px solid ${ACCENT[t.status] ?? "#8a8a82"}`,
                      borderRadius: 6,
                      background: "#fff",
                      padding: 8,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ font: "600 11px ui-monospace, Menlo, monospace" }}>{t.taskId}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "#6f6f68", marginTop: 4 }}>
                      {t.agent ?? "unassigned"}
                      {t.attempts > 1 ? ` · ×${t.attempts}` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "#6f6f68", marginTop: 2 }}>
                      {t.targets.join(", ") || "no targets"}
                      {t.lastRunOutcome ? ` · ${t.lastRunOutcome}` : ""}
                    </div>
                    {t.blockedReason && (
                      <div style={{ fontSize: 10, color: "#c0392b", marginTop: 3 }}>
                        {t.blockedReason.slice(0, 120)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Does the tier distinction pay for itself?">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "#6f6f68", fontSize: 11 }}>
              <th style={cell}>tier / effort</th>
              <th style={cell}>runs</th>
              <th style={cell}>success</th>
              <th style={cell}>avg attempts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.key} style={{ borderTop: "1px solid #eee" }}>
                <td style={cell}>{v.key}</td>
                <td style={cell}>{v.total}</td>
                <td style={cell}>{Math.round((v.ok / v.total) * 100)}%</td>
                <td style={cell}>{(v.attempts / v.total).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "#6f6f68", fontSize: 11, marginTop: 8 }}>
          A lower tier with <strong>more attempts</strong> than a higher one is the cheap
          model giving back what it saved. Attempts count reruns, so environmental failures
          inflate them too — read a high number as &ldquo;look at these runs&rdquo;, not as
          proof about the model.
          {typeof project.stats.untestedSuccesses === "number" &&
            project.stats.untestedSuccesses > 0 && (
              <> {project.stats.untestedSuccesses} success(es) carried no test evidence.</>
            )}
        </p>
      </Section>

      <Section title="Goals">
        {goals.map((g) => {
          const own = tasks.filter((t) => t.goalId === g.goalId);
          return (
            <div key={g.goalId} style={{ fontSize: 12.5, padding: "6px 0", borderTop: "1px solid #eee" }}>
              <code>{g.goalId}</code> <strong>{g.status}</strong> —{" "}
              {own.filter((t) => t.status === "done").length}/{own.length} done · {g.title}
            </div>
          );
        })}
      </Section>

      <Section title="Recent runs">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <tbody>
            {runs.map((r) => (
              <tr key={r.runId} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ ...cell, fontFamily: "ui-monospace, Menlo, monospace" }}>
                  {r.taskId ?? r.agent ?? "adhoc"}
                </td>
                <td style={{ ...cell, color: r.status === "success" ? "#2f8f4e" : "#c0392b" }}>{r.status}</td>
                <td style={cell}>{r.model ?? "—"}</td>
                <td style={cell}>{r.effort ? `effort=${r.effort}` : "—"}</td>
                <td style={cell}>{r.durationSec === null ? "—" : `${r.durationSec}s`}</td>
                <td style={{ ...cell, color: "#6f6f68" }}>{r.reposChanged.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

const cell = { padding: "5px 8px" } as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{ border: "1px solid #e4e4e1", borderRadius: 8, background: "#fff", marginBottom: 18 }}
    >
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
      <div style={{ padding: 14, overflowX: "auto" }}>{children}</div>
    </section>
  );
}
