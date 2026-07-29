# awo-dashboard

Hosted, read-only dashboard for [`@supanut9/awo`](https://github.com/supanut9/awo)
workspaces. It shows projects that are **not** on your machine — the local
`awo ui` already covers the one in front of you.

## How data gets here

The workspace on disk stays canonical (awo `PROJECT_PLAN.md` §3.8). A workspace
opts in by pushing a **projection**:

```sh
# in the workspace
echo 'MONGO_URI=mongodb+srv://…' > .workspace/credentials/mongo.env   # gitignored
awo publish --dry-run    # see what would be sent
awo publish
```

Four collections, keyed on `workspaceId`: `awo_projects`, `awo_goals`,
`awo_tasks`, `awo_runs`. Statuses, counts and model/tier/effort travel; prompts
and file paths do not.

Nothing here writes. A hosted copy that could be edited would immediately become a
second source of truth.

## Run it

```sh
npm install
cp .env.example .env.local     # point MONGODB_URI at the same cluster
npm run dev
```

## What it shows

- every published workspace, newest first
- per project: the board across the seven lifecycle states, goals with progress,
  and the last 20 runs
- **tier/effort against outcomes** — success rate and average attempts per
  `tier / effort`. A low-tier row with more attempts than a high-tier one is the
  cheap model costing more than it saved; the point is to judge that from data
  rather than assume it.

## Not built yet

Authentication and multi-tenancy. Right now anyone who can reach the deployment
sees every workspace in the database, so keep it private until that exists.
