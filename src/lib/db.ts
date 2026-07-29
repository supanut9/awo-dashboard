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

export async function getConnection(): Promise<Connection | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;

  const { uri, dbName, prefix } = parse(raw);
  if (!looksLikeMongoUri(uri)) return null;

  // One client per distinct URI. A client per request exhausts the pool under
  // Next's dev reloading, and per-viewer connections need reuse even more.
  let client = clients.get(raw);
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    clients.set(raw, client);
  }

  return { db: client.db(dbName), prefix };
}

export function collectionName(prefix: string, name: string): string {
  return `${prefix}${name}`;
}
