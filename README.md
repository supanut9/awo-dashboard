# awo-dashboard

Hosted, read-only dashboard for [`@supanut9/awo`](https://github.com/supanut9/awo)
workspaces. It shows projects that are **not** on your machine — the local
`awo ui` already covers the one in front of you.

## Deploy to Vercel

```sh
npx vercel            # first deploy, links the project
npx vercel --prod
```

No environment variables are required — viewers connect their own cluster at
`/connect`.

Two build notes, both already handled in `next.config.mjs`:

- **`experimental.useTypeScriptCli`** — TypeScript 7 is the native rewrite and no
  longer exposes the compiler API Next's build worker used, so Next must shell out
  to `tsc`. Without it the production build fails outright. The alternative was
  pinning back to TypeScript 6.
- **`turbopack.root`** — pins the root so turbopack stops inferring a parent
  directory when other lockfiles exist nearby.

Every page is `force-dynamic`: this data changes whenever someone runs
`awo publish`, and a cached page shows state that has already moved on.

## How data gets here

The workspace on disk stays canonical (awo `PROJECT_PLAN.md` §3.8). A workspace
opts in by pushing a **projection**:

```sh
# in the workspace
echo 'MONGO_URI=mongodb+srv://…' > .workspace/credentials/mongo.env   # gitignored

awo publish --dry-run    # see what would be sent, without connecting
awo publish              # manual sync
awo publish --watch      # auto-sync: pushes on every change, debounced
```

`--watch` is a watcher rather than a hook inside the commands, deliberately: nothing
in `task run` or `task complete` waits on the network, so a dead connection degrades
the dashboard and never the work.

Five collections, keyed on `workspaceId`: `awo_projects`, `awo_goals`, `awo_tasks`,
`awo_runs`, `awo_events`. Nothing needs creating by hand — MongoDB makes the
collections on first write, and `awo publish` creates the indexes idempotently every
time.

**How much travels is a choice.** By default (`detail: "summary"`) only statuses,
counts and model/tier/effort go, and nothing describing the work leaves the machine.
Set it in the workspace manifest to send the rest:

```jsonc
// .workspace/manifest.json
"publish": {
  "detail": "full",                                  // + bodies, run records, event streams
  "redact": { "prompts": false, "filePaths": false } // include the verbatim prompts too
}
```

With `full`, the dashboard shows what the local `awo ui` shows: each task's
objective and steps, the goal's definition-of-done and the requirement behind it,
and every run's event stream and markdown record. That prose describes your code and
your prompts, which is exactly why it is opt-in.

Nothing here writes. A hosted copy that could be edited would immediately become a
second source of truth.

## Run it

```sh
npm install
npm run dev
```

Then open `/connect` and paste the connection string. **You** supply the cluster —
this deployment ships with none, and reads nothing until you connect one. A single
deployment can therefore serve different people looking at different clusters.


### About handing a connection string to a website

Be clear-eyed about this, because the repo is public and anyone may deploy it:

- the string is **sent to whatever server hosts the page** and held in memory there
  to open the connection
- it is kept in an **httpOnly** cookie (page JavaScript cannot read it back),
  `sameSite=lax`, `secure` in production, and is **not written to any database here**
- that still means trusting the host with a credential. Use a **read-only user
  scoped to the one database** — never an admin URI
- a public deployment lets any visitor make that server connect to an arbitrary
  MongoDB host. If you deploy this publicly, put it behind auth or accept that

`Disconnect and forget` on `/connect` clears the cookie.

## What it shows

- every published workspace, newest first
- per project: the board across the seven lifecycle states, goals with progress,
  and the last 20 runs
- click any card for a **task detail** page: definition, state, dependencies, and the
  last run's event stream and record (needs `detail: "full"`)
- **tier/effort against outcomes** — success rate and average attempts per
  `tier / effort`. A low-tier row with more attempts than a high-tier one is the
  cheap model costing more than it saved; the point is to judge that from data
  rather than assume it.

## Not built yet

**Authentication.** Whoever connects a cluster sees every workspace in it — which is
fine when that is your own cluster, and not fine on a shared deployment. There is no
login, no per-user scoping, and no rate limiting on outbound connections.
