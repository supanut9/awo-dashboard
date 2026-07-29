import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE, looksLikeMongoUri } from "@/lib/db";
import { buildMongoUri } from "@/lib/mongo-uri";

export const dynamic = "force-dynamic";

async function connect(formData: FormData): Promise<void> {
  "use server";
  const pasted = String(formData.get("uri") ?? "").trim();
  const dbName = String(formData.get("db") ?? "awo").trim() || "awo";
  const prefix = String(formData.get("prefix") ?? "awo_").trim() || "awo_";

  // A full string still works for anyone who already has one; the separate fields are
  // the default because they are the form Atlas actually hands you.
  const uri =
    pasted !== ""
      ? pasted
      : buildMongoUri({
          username: String(formData.get("username") ?? ""),
          password: String(formData.get("password") ?? ""),
          host: String(formData.get("host") ?? ""),
        });

  if (!uri || !looksLikeMongoUri(uri)) redirect("/connect?error=1");

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

const FIELD =
  "mt-1 block w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 font-mono " +
  "text-[13px] text-neutral-900 placeholder:text-neutral-400 focus:border-indigo-500 " +
  "focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const LABEL = "block text-xs text-neutral-500 dark:text-neutral-400";

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const jar = await cookies();
  const connected = Boolean(jar.get(COOKIE));

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-base font-semibold">Connect a cluster</h1>
      <p className="mt-1 text-[13px] text-neutral-500 dark:text-neutral-400">
        Point this dashboard at the MongoDB your workspaces publish to with{" "}
        <code className="font-mono">awo publish</code>. Nothing is read until you do.
      </p>

      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[12.5px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Read this before entering credentials.</strong> They are sent to whichever
        server hosts this page and held in memory there to make the connection. They are
        kept in an httpOnly cookie in your browser and <em>not</em> saved in any database
        here — but on a deployment you do not operate, you are trusting that host with a
        credential. Use a <strong>read-only user scoped to the one database</strong>, never
        an admin account.
      </div>

      {error && (
        <p className="mt-3 text-[13px] text-red-600 dark:text-red-400">
          Could not build a connection from that. Check the host looks like{" "}
          <code className="font-mono">cluster0.abcde.mongodb.net</code>, and that the
          username and password are both filled in.
        </p>
      )}

      <form action={connect} className="mt-5 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Username
            <input
              name="username"
              autoComplete="off"
              placeholder="awo_dashboard"
              className={FIELD}
            />
          </label>
          <label className={LABEL}>
            Password
            <input name="password" type="password" autoComplete="new-password" className={FIELD} />
          </label>
        </div>

        <label className={LABEL}>
          Cluster host
          <input
            name="host"
            placeholder="cluster0.kty2sxs.mongodb.net"
            autoComplete="off"
            className={FIELD}
          />
          <span className="mt-1 block text-[11px] text-neutral-400">
            Just the host. A pasted <code className="font-mono">mongodb+srv://…</code> is
            accepted too — the scheme, credentials and trailing path are stripped.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={LABEL}>
            Database
            <input name="db" defaultValue="awo" className={FIELD} />
          </label>
          <label className={LABEL}>
            Collection prefix
            <input name="prefix" defaultValue="awo_" className={FIELD} />
          </label>
        </div>

        <details className="mt-1">
          <summary className="cursor-pointer text-[12px] text-indigo-600 dark:text-indigo-400">
            …or paste a full connection string instead
          </summary>
          <label className={`${LABEL} mt-2`}>
            Connection string
            <input
              name="uri"
              type="password"
              autoComplete="off"
              placeholder="mongodb+srv://readonly:…@cluster.example.mongodb.net"
              className={FIELD}
            />
            <span className="mt-1 block text-[11px] text-neutral-400">
              Takes precedence over the fields above. You must percent-encode a password
              containing <code className="font-mono">@ / : ? #</code> yourself — which the
              fields above do for you.
            </span>
          </label>
        </details>

        <button
          type="submit"
          className="mt-1 justify-self-start rounded-md bg-indigo-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-indigo-500"
        >
          Connect
        </button>
      </form>

      {connected && (
        <form action={disconnect} className="mt-4">
          <button
            type="submit"
            className="rounded-md border border-red-300 px-3.5 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/40"
          >
            Disconnect and forget
          </button>
        </form>
      )}
    </main>
  );
}
