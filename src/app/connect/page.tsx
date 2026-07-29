import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, looksLikeMongoUri } from "@/lib/db";

export const dynamic = "force-dynamic";

async function connect(formData: FormData): Promise<void> {
  "use server";
  const uri = String(formData.get("uri") ?? "").trim();
  const dbName = String(formData.get("db") ?? "awo").trim() || "awo";
  const prefix = String(formData.get("prefix") ?? "awo_").trim() || "awo_";

  if (!looksLikeMongoUri(uri)) redirect("/connect?error=1");

  const jar = await cookies();
  // httpOnly so page JavaScript cannot read the credential back; sameSite=lax so
  // another site cannot cause a request that silently uses it. Session-length only —
  // this deployment deliberately stores nobody's connection string.
  jar.set(COOKIE, [uri, dbName, prefix].join("|"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  redirect("/");
}

async function disconnect(): Promise<void> {
  "use server";
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/connect");
}

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const jar = await cookies();
  const connected = Boolean(jar.get(COOKIE));

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>Connect a cluster</h1>
      <p style={{ color: "#6f6f68", fontSize: 13, margin: "0 0 18px" }}>
        Point this dashboard at the MongoDB your workspaces publish to with{" "}
        <code>awo publish</code>. Nothing is read until you do.
      </p>

      <div
        style={{
          border: "1px solid #e4b062",
          background: "#fdf6e8",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 12.5,
          marginBottom: 18,
        }}
      >
        <strong>Read this before pasting a connection string.</strong> It is sent to
        whichever server hosts this page and held in memory there to make the
        connection. It is kept in an httpOnly cookie in your browser and <em>not</em>{" "}
        saved in any database here — but on a deployment you do not operate, you are
        trusting that host with a credential. Use a{" "}
        <strong>read-only user scoped to the one database</strong>, never an admin URI.
      </div>

      {error && (
        <p style={{ color: "#c0392b", fontSize: 13 }}>
          That does not look like a MongoDB connection string.
        </p>
      )}

      <form action={connect} style={{ display: "grid", gap: 10 }}>
        <label style={{ fontSize: 12, color: "#6f6f68" }}>
          Connection string
          <input
            name="uri"
            type="password"
            required
            placeholder="mongodb+srv://readonly:…@cluster.example.mongodb.net"
            autoComplete="off"
            style={input}
          />
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ fontSize: 12, color: "#6f6f68", flex: 1 }}>
            Database
            <input name="db" defaultValue="awo" style={input} />
          </label>
          <label style={{ fontSize: 12, color: "#6f6f68", flex: 1 }}>
            Collection prefix
            <input name="prefix" defaultValue="awo_" style={input} />
          </label>
        </div>
        <button type="submit" style={button}>
          Connect
        </button>
      </form>

      {connected && (
        <form action={disconnect} style={{ marginTop: 14 }}>
          <button type="submit" style={{ ...button, background: "#fff", color: "#c0392b" }}>
            Disconnect and forget
          </button>
        </form>
      )}
    </main>
  );
}

const input = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "7px 9px",
  border: "1px solid #d9d9d4",
  borderRadius: 6,
  font: "13px ui-monospace, Menlo, monospace",
  boxSizing: "border-box" as const,
};

const button = {
  padding: "8px 14px",
  border: "1px solid #3b5bdb",
  borderRadius: 6,
  background: "#3b5bdb",
  color: "#fff",
  fontSize: 13,
  cursor: "pointer",
};
