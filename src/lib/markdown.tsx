import { marked } from "marked";

/**
 * Run records and task bodies are markdown (awo §7.2/§7.3). Rendering them as raw
 * `<pre>` was legible but unreadable — headings, tables and lists carry most of the
 * structure in a run record, and losing it makes a review harder than reading the
 * file directly.
 */
export function Markdown({ source }: { source: string }) {
  const html = marked.parse(source, { async: false, gfm: true }) as string;
  return <div className="prose-awo" dangerouslySetInnerHTML={{ __html: html }} />;
}
