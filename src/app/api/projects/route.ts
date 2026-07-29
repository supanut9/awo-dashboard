import { collectionName, getConnectionResult } from "@/lib/db";

/** JSON for anything that wants the same projection programmatically. */
export async function GET(): Promise<Response> {
  const result = await getConnectionResult();

  if (!result.ok) {
    // The reason, not the driver's OpenSSL text: a caller can act on "the IP is not
    // allow-listed" and cannot act on "ssl3_read_bytes".
    const body =
      result.reason === "none"
        ? { error: "No cluster connected. Visit /connect." }
        : result.reason === "malformed"
          ? { error: "The stored connection is not a valid MongoDB URI." }
          : { error: result.likely, detail: result.detail };
    return Response.json(body, { status: result.reason === "unreachable" ? 502 : 409 });
  }

  try {
    const projects = await result.connection.db
      .collection(collectionName(result.connection.prefix, "projects"))
      .find({})
      .toArray();
    return Response.json({ projects });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
