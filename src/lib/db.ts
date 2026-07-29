import { cookies } from "next/headers";
import { MongoClient, type Db } from "mongodb";

/**
 * The dashboard is a READER over the projection `awo publish` writes. It never
 * writes: the workspace on disk is canonical (awo §3.8), and a hosted copy that
 * could be edited would immediately become a second source of truth.
 *
 * Where the connection string comes from — two sources, in this order:
 *
 *  1. a cookie the viewer set through /connect (bring-your-own cluster)
 *  2. MONGODB_URI in the environment (a deployment dedicated to one cluster)
 *
 * The cookie is httpOnly, so page JavaScript cannot read it back, and it is never
 * persisted server-side: this deployment stores nobody's credentials. It is still a
 * credential travelling to a server you may not control — see the warning on
 * /connect and in the README.
 */
export const COOKIE = "awo_mongo";

const clients = new Map<string, MongoClient>();

export interface Connection {
  db: Db;
  prefix: string;
  source: "cookie" | "env";
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
  const fromCookie = jar.get(COOKIE)?.value;
  const raw =
    fromCookie ??
    (process.env.MONGODB_URI
      ? [
          process.env.MONGODB_URI,
          process.env.MONGODB_DB ?? "awo",
          process.env.MONGODB_COLLECTION_PREFIX ?? "awo_",
        ].join("|")
      : undefined);

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

  return { db: client.db(dbName), prefix, source: fromCookie ? "cookie" : "env" };
}

export function collectionName(prefix: string, name: string): string {
  return `${prefix}${name}`;
}
