import { collectionName, getConnectionResult } from "@/lib/db";
import type { RequirementDoc } from "@/lib/types";
import { ConnectionProblem, Empty, Page, ProjectNav, REQUIREMENT_STYLE, Section, Stat } from "@/lib/ui";
import { Markdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

const ORDER = ["proposed", "draft", "approved", "rejected"] as const;

function nextStep(requirement: RequirementDoc): string {
  if (requirement.status === "draft") return `Refine criteria: awo req refine ${requirement.requirementId}`;
  if (requirement.status === "proposed") return "Human decision required. An agent must not approve it.";
  if (requirement.status === "approved" && !requirement.goalId) return `Plan work: awo goal new --from ${requirement.requirementId}`;
  if (requirement.status === "rejected") return "Revise the requirement, then propose it again.";
  return `Planned in ${requirement.goalId}. Follow the goal board.`;
}

export default async function RequirementsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const result = await getConnectionResult();
  if (!result.ok) {
    return <Page><ConnectionProblem failure={result} /></Page>;
  }

  const requirements = await result.connection.db
    .collection<RequirementDoc>(collectionName(result.connection.prefix, "requirements"))
    .find({ workspaceId })
    .toArray();
  const byStatus = (status: string): RequirementDoc[] => requirements.filter((r) => r.status === status);

  return (
    <Page>
      <ProjectNav workspaceId={workspaceId} active="requirements" />
      <div className="mb-4 flex flex-wrap overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <Stat label="Intake" value={requirements.filter((r) => !r.goalId).length} />
        <Stat label="Need approval" value={byStatus("proposed").length} warn={byStatus("proposed").length > 0} />
        <Stat label="Planned" value={requirements.filter((r) => Boolean(r.goalId)).length} />
        <Stat label="Criteria covered" value={`${requirements.reduce((n, r) => n + r.criteria.covered, 0)}/${requirements.reduce((n, r) => n + r.criteria.total, 0)}`} />
      </div>

      <Section title="Requirement control" pad={false}>
        {requirements.length === 0 ? (
          <Empty>No requirements were published. Update AWO, then run <code className="font-mono">awo publish</code>.</Empty>
        ) : (
          <div className="overflow-x-auto p-3.5">
            <div className="grid min-w-[940px] grid-cols-4 gap-3">
              {ORDER.map((status) => {
                const entries = byStatus(status);
                return (
                  <div key={status}>
                    <div className="mb-2 flex justify-between px-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      <span>{status}</span><span>{entries.length || ""}</span>
                    </div>
                    {entries.map((r) => (
                      <article key={r.requirementId} className={`mb-2 rounded-md border border-l-3 border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-950 ${REQUIREMENT_STYLE[r.status] ?? ""}`}>
                        <div className="font-mono text-[11px] font-semibold">{r.requirementId}</div>
                        <h2 className="mt-1 text-xs font-medium leading-snug">{r.title}</h2>
                        <p className="mt-2 text-[11px] text-neutral-500">{r.criteria.covered}/{r.criteria.total} criteria covered{r.criteria.exceptions > 0 ? ` · ${r.criteria.exceptions} exception${r.criteria.exceptions === 1 ? "" : "s"}` : ""}</p>
                        <p className="mt-2 border-t border-neutral-200 pt-2 text-[11px] leading-relaxed text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">{nextStep(r)}</p>
                        {r.body && <details className="mt-2 text-[11px]"><summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">requirement detail</summary><div className="mt-2 rounded border border-neutral-200 p-2 dark:border-neutral-800"><Markdown source={r.body} /></div></details>}
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>
    </Page>
  );
}
