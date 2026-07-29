import Link from "next/link";
import { collection, db } from "@/lib/db";
import type { ProjectDoc } from "@/lib/types";

// Every project page reflects what was last published; caching it would show
// state that has already moved on.
export const dynamic = "force-dynamic";

async function projects(): Promise<ProjectDoc[]> {
  const database = await db();
  return database
    .collection<ProjectDoc>(collection("projects"))
    .find({}, { sort: { updatedAt: -1 } })
    .toArray();
}

export default async function Home() {
  let rows: ProjectDoc[] = [];
  let error: string | null = null;
  try {
    rows = await projects();
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>awo dashboard</h1>
      <p style={{ color: "#6f6f68", fontSize: 13, margin: "0 0 20px" }}>
        Workspaces that have run <code>awo publish</code>. Read-only — the workspace on
        disk stays canonical.
      </p>

      {error && (
        <p style={{ color: "#c0392b", fontSize: 13 }}>
          {error}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p style={{ color: "#6f6f68", fontSize: 13 }}>
          Nothing published yet. In a workspace: add <code>MONGO_URI</code> to{" "}
          <code>.workspace/credentials/mongo.env</code>, then run <code>awo publish</code>.
        </p>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((p) => {
          const pct = p.stats.successRate === null ? "—" : `${Math.round(p.stats.successRate * 100)}%`;
          return (
            <Link
              key={p.workspaceId}
              href={`/p/${p.workspaceId}`}
              style={{
                display: "block",
                border: "1px solid #e4e4e1",
                borderRadius: 8,
                background: "#fff",
                padding: "12px 14px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span
                  style={{
                    background: "#3b5bdb",
                    color: "#fff",
                    borderRadius: 5,
                    padding: "2px 6px",
                    font: "600 11px ui-monospace, Menlo, monospace",
                  }}
                >
                  {p.projectKey}
                </span>
                <strong style={{ fontSize: 14 }}>{p.projectName}</strong>
                <span style={{ color: "#6f6f68", fontSize: 12 }}>awo {p.libraryVersion}</span>
              </div>
              <div style={{ color: "#6f6f68", fontSize: 12, marginTop: 6 }}>
                {p.stats.totalTasks} tasks · {p.stats.byStatus.done ?? 0} done ·{" "}
                {p.stats.byStatus.blocked ?? 0} blocked · {p.stats.totalRuns} runs · {pct} success ·{" "}
                {p.repos.length} repos
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
