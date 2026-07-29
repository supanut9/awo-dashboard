import { collection, db } from "@/lib/db";

/** JSON for anything that wants the same projection programmatically. */
export async function GET(): Promise<Response> {
  try {
    const database = await db();
    const projects = await database.collection(collection("projects")).find({}).toArray();
    return Response.json({ projects });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
