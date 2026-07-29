import { cookies } from "next/headers";
import { MongoClient, type Db } from "mongodb";

/**
 * The dashboard is a READER over the projection `awo publish` writes. It never
 * writes: the workspace on disk is canonical (awo §3.8), and a hosted copy that
 * could be edited would immediately become a second source of truth.
 *
 * The connection string comes from exactly ONE place: a cookie the viewer sets
 * through /connect.
 *
 * There was a MONGODB_URI fallback, and it was a mistake for a deployment with no
 * login. A server-side credential makes the URL itself sufficient to read every
 * project in that cluster — anyone who finds the deployment sees everything, with no
 * authentication anywhere in the stack. Bring-your-own-connection means the deployment
 * is inert until a viewer supplies a string they already hold: knowing the URL grants
 * nothing.
 *
 * The cookie is httpOnly, so page JavaScript cannot read it back, and it is never
 * persisted server-side — this deployment stores nobody's credentials. It is still a
 * credential travelling to a server you may not control; see the warning on /connect.
 */
export const COOKIE = "awo_mongo";

const clients = new Map<string, MongoClient>();

export interface Connection {
  db: Db;
  prefix: string;
}

function parse(raw: string): { uri: string; dbName: string; prefix: string } {
  const [uri, dbName = "awo", prefix = "awo_"] = raw.split("|");
  return { uri, dbName, prefix };
}

/** Validated before use: a typo should be a message, not a stack trace. */
export function looksLikeMongoUri(uri: string): boolean {
  return /^mongodb(\+srv)?:\/\/.+/.test(uri.trim());
}

/**
 * Why a connection failed, in terms the viewer can act on.
 *
 * The driver's failure for an IP that is not allow-listed is
 * `tlsv1 alert internal error … rec_layer_s3.c:918` — an OpenSSL record-layer message
 * that says nothing about the actual cause, which is Atlas closing the socket before
 * auth. Handing that to a user is the same as handing them nothing, so the diagnosis
 * is made here where the URI is in scope.
 */
export type ConnectionFailure =
  | { reason: "none" }
  | { reason: "malformed" }
  | { reason: "unreachable"; likely: string; detail: string };

export type ConnectionResult =
  | { ok: true; connection: Connection }
  | ({ ok: false } & ConnectionFailure);

function diagnose(err: unknown): ConnectionFailure {
  const message = err instanceof Error ? err.message : String(err);

  // Atlas refuses a non-allow-listed IP at the TLS layer, before authentication, so
  // this is emphatically NOT a credentials problem — and telling someone to check
  // their password here would send them looking in the wrong place.
  if (/tlsv1 alert internal error|SSL alert number 80/i.test(message)) {
    return {
      reason: "unreachable",
      likely:
        "This cluster refused the connection before authentication, which almost always " +
        "means the connecting IP is not in its access list. It is not a username or " +
        "password problem.",
      detail: message,
    };
  }
  if (/authentication failed|bad auth/i.test(message)) {
    return {
      reason: "unreachable",
      likely: "The cluster answered but rejected these credentials. Check the username and password.",
      detail: message,
    };
  }
  if (/ENOTFOUND|querySrv|getaddrinfo/i.test(message)) {
    return {
      reason: "unreachable",
      likely: "That host does not resolve. Check the cluster host — it looks like cluster0.abcde.mongodb.net.",
      detail: message,
    };
  }
  if (/timed out|ETIMEDOUT|serverSelectionTimeout/i.test(message)) {
    return {
      reason: "unreachable",
      likely: "The cluster did not answer in time. It may be paused, or the network is blocking it.",
      detail: message,
    };
  }
  return { reason: "unreachable", likely: "The cluster could not be reached.", detail: message };
}

/** The connection, or a reason a viewer can act on. Never throws. */
export async function getConnectionResult(): Promise<ConnectionResult> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return { ok: false, reason: "none" };

  const { uri, dbName, prefix } = parse(raw);
  if (!looksLikeMongoUri(uri)) return { ok: false, reason: "malformed" };

  let client = clients.get(raw);
  if (!client) {
    const fresh = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    try {
      await fresh.connect();
    } catch (err) {
      // Not cached: a failed client must not be reused, or a fixed access list would
      // still look broken until the server restarted.
      await fresh.close().catch(() => {});
      return { ok: false, ...diagnose(err) };
    }
    client = fresh;
    clients.set(raw, client);
  }

  return { ok: true, connection: { db: client.db(dbName), prefix } };
}

export async function getConnection(): Promise<Connection | null> {
  const result = await getConnectionResult();
  return result.ok ? result.connection : null;
}

export function collectionName(prefix: string, name: string): string {
  return `${prefix}${name}`;
}
