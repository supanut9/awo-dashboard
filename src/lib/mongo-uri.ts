/**
 * Assemble a connection string from parts, rather than asking for one.
 *
 * Atlas hands you a string containing the literal `<db_password>`, so "paste the
 * connection string" really means "hand-edit a URI". And a password containing `@`,
 * `/`, `:`, `?` or `#` then silently produces a string that either fails to parse or
 * points at the wrong host — those characters are common in generated passwords,
 * which makes pasting a quiet trap rather than a rare one.
 *
 * Encoding each part removes the whole class of problem, so the fields are the
 * default and a pasted string is the fallback.
 */
export function buildMongoUri(input: {
  username: string;
  password: string;
  host: string;
}): string | null {
  const host = normaliseHost(input.host);
  if (host === null) return null;
  if (input.username.trim() === "" || input.password === "") return null;

  const user = encodeURIComponent(input.username.trim());
  const pass = encodeURIComponent(input.password);
  // appName so this dashboard is identifiable in the cluster's connection logs —
  // useful when you are wondering who is querying.
  return `mongodb+srv://${user}:${pass}@${host}/?appName=awo-dashboard`;
}

/**
 * Tolerates a pasted scheme, embedded credentials and a trailing path or query.
 * People copy more than the host; rejecting that is pedantry, not validation.
 */
export function normaliseHost(raw: string): string | null {
  const host = raw
    .trim()
    .replace(/^mongodb(\+srv)?:\/\//i, "")
    .replace(/^[^@/]*@/, "")
    .replace(/[/?].*$/, "");

  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(host) ? host : null;
}
