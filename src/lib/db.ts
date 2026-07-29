import { MongoClient, type Db } from "mongodb";

/**
 * The dashboard is a READER. It implements the same shape as awo's local
 * `WorkspaceReader` (§7.5) over the projection that `awo publish` writes, so the
 * views can be shared with the CLI's dashboard rather than written twice.
 *
 * It never writes: the workspace on disk is canonical (§3.8), and a hosted copy
 * that could be edited would immediately become a second source of truth.
 */
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "awo";
const prefix = process.env.MONGODB_COLLECTION_PREFIX ?? "awo_";

let client: MongoClient | null = null;

export function collection(name: string): string {
  return `${prefix}${name}`;
}

export async function db(): Promise<Db> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env.local and point it at the cluster `awo publish` writes to."
    );
  }
  // Reused across requests: Next hot-reloads modules in dev, and a new client per
  // request exhausts the connection pool quickly.
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
  }
  return client.db(dbName);
}
