import { collectionName, getConnection } from "@/lib/db";

/** JSON for anything that wants the same projection programmatically. */
export async function GET(): Promise<Response> {
  try {
    const conn = await getConnection();
    if (!conn) {
      return Response.json(
        { error: "No cluster connected. Visit /connect, or set MONGODB_URI." },
        { status: 409 }
      );
    }
    const projects = await conn.db
      .collection(collectionName(conn.prefix, "projects"))
      .find({})
      .toArray();
    return Response.json({ projects, source: conn.source });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
