import { collectionName, getConnectionResult } from "@/lib/db";
import type { AgentDoc, TaskDoc } from "@/lib/types";
import { ConnectionProblem, Empty, Page, ProjectNav, Section } from "@/lib/ui";

export const dynamic = "force-dynamic";

function OrgTree({ agents }: { agents: AgentDoc[] }) {
  const known = new Set(agents.map((agent) => agent.agentId));
  const children = new Map<string | null, AgentDoc[]>();
  for (const agent of agents) {
    const parent = agent.reportsTo && known.has(agent.reportsTo) ? agent.reportsTo : null;
    children.set(parent, [...(children.get(parent) ?? []), agent]);
  }

  const render = (parent: string | null): React.ReactNode => (
    <div className={parent ? "ml-5 border-l border-slate-200 pl-4 dark:border-neutral-800" : ""}>
      {(children.get(parent) ?? []).map((agent) => (
        <div key={agent.agentId} className="mb-3 last:mb-0">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold">{agent.agentId}</span>
              {agent.tier && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-neutral-800">{agent.tier}</span>}
              <span className="ml-auto text-[11px] text-slate-500">{agent.openTasks}/{agent.taskCount} open</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
              {agent.delegatesTo.length > 0 && <span>delegates to {agent.delegatesTo.join(", ")}</span>}
              {agent.reviews.length > 0 && <span>reviews {agent.reviews.join(", ")}</span>}
            </div>
          </div>
          {render(agent.agentId)}
        </div>
      ))}
    </div>
  );

  return <>{render(null)}</>;
}

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const result = await getConnectionResult();
  if (!result.ok) return <Page><ConnectionProblem failure={result} /></Page>;

  const { db, prefix } = result.connection;
  const [agents, tasks] = await Promise.all([
    db.collection<AgentDoc>(collectionName(prefix, "agents")).find({ workspaceId }).toArray(),
    db.collection<TaskDoc>(collectionName(prefix, "tasks")).find({ workspaceId }).toArray(),
  ]);
  const known = new Set(agents.map((agent) => agent.agentId));
  const taskAgents = new Set(tasks.map((task) => task.agent).filter((agent): agent is string => Boolean(agent)));
  const orphaned = [...taskAgents].filter((agent) => !known.has(agent));

  return (
    <Page>
      <ProjectNav workspaceId={workspaceId} active="organization" />
      <h1 className="mb-1 mt-1.5 text-base font-semibold">Agent organization</h1>
      <p className="mb-4 text-xs text-slate-500">Reporting, delegation, and review relationships describe responsibility. They do not grant approval, merge, or deployment authority.</p>
      {agents.length === 0 ? (
        <Section title="No organization projection">
          <Empty>This workspace was published before agent relationships were available. Update AWO and run <code className="font-mono">awo publish</code>.</Empty>
        </Section>
      ) : (
        <Section title={`${agents.length} installed roles`}>
          <OrgTree agents={agents} />
          {orphaned.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Tasks reference roles absent from the published organization: {orphaned.join(", ")}.
            </div>
          )}
          <p className="mt-4 text-[11px] text-slate-500">Task ownership remains explicit on each task. The graph does not automatically reassign work.</p>
        </Section>
      )}
    </Page>
  );
}
