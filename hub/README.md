# NAM Initiative Hub: integration guide

This is the North America Mobility (NAM) initiative hub. For each initiative it tracks:

- status and phase
- OKRs, with weekly updates for each key result
- a roadmap of releases and milestones, with Jira and Confluence links
- a learning plan
- business readiness
- a PRD with 32 sections, based on Marty Cagan's approach
- a side-by-side of today and the 2028 vision
- a shared site map with flows
- evidence and discussion

Everything the app does is in one HTML file: the HTML, the CSS and plain JavaScript, with no build step. This guide explains how it works so you can move it into our own stack.

## What's in this folder

| File | What it is |
|---|---|
| `initiative-hub.html` | The app exactly as published. Open it in a browser and you get the example data, read-only. |
| `initiative-hub-local-demo.html` | The same app with an in-memory database, so every edit works in your browser. Nothing is saved when you close the tab. Click **Load example initiatives** to start. Reading documents with Claude is turned off here. |
| `example-data.json` | Every record the example initiatives create, grouped by collection. Use it as fixtures or seed data, and as a reference for the data shapes. |
| `local-test-mock.js` | The in-memory stand-in for the database, user, file upload and Claude services. It's for tests only. |
| `README.md` | This guide. |

## How the app is built

- **Plain JavaScript.** The app is a single-page app inside one `<script>` with hash routing: `#home`, `#okrs`, `#roadmap`, `#sitemap`, `#guide`, and `#<initiativeId>` for one initiative. Each view is a function that returns an HTML string, and `render()` redraws `#app`. One click handler routes on `data-action`, `data-open`, `data-tab` and similar attributes.
- **Platform services.** The app reaches everything outside the page through `window.claude.use(name)`. Each of these needs a replacement when you integrate:

| Service | What the app uses it for | Replace with |
|---|---|---|
| `db` | A shared document store. It has `collection(c).onSnapshot()` for live updates, plus `doc(path).set / update / delete`. | Postgres through the Prisma app (repo `santiago2692/prd-hub`), or Firestore. Live updates can come from polling, server-sent events or websockets. |
| `user` | `me()`, `canEdit()` and `profiles(ids)`. | Google sign-in through NextAuth (already set up in the prd-hub repo), plus a role on each user: Admin, Editor or Viewer. |
| `assets` | `upload(file)` returns an id, and files are served at `/_blob/<id>`. | Google Cloud Storage or S3. Store the object key where the app stores `assetId`. |
| `sample` | Claude reads uploaded documents and returns a JSON draft. | A server endpoint that calls the Anthropic API (see "Reading documents with Claude"). |

- **Permissions.**
  - Editors can create and edit everything.
  - Anyone who can view can add comments.
  - In the published version, these collections need Editor rights to write: `initiatives`, `updates` and `nodes`. `comments` is open to contributors.
- **Libraries loaded on demand from jsDelivr.** pdf.js 3.11.174 reads PDF text and mammoth 1.6.0 reads Word files. Both run in the browser before the text goes to Claude.

## Data model

There are four collections. The examples write a fifth, `objectives`, but the app doesn't use it any more. Dates are `YYYY-MM-DD` strings, and timestamps are ISO strings. People are stored as user ids and resolved to names when the page draws.

### `initiatives/{id}`

One document per initiative.

**Identity and status**

| Field | Type | Notes |
|---|---|---|
| `id`, `name`, `goal`, `team` | string | |
| `phase` | 0–4 | Discover, Define, Validate, Build, Launch |
| `health` | `on` / `risk` / `blocked` | |
| `exists` | boolean | `false` means nothing like it exists today, so the 2028 side shows alone |
| `owner`, `crew[]`, `roles[]` | user ids, role labels | |
| `next` | `{label, date}` | The next milestone |
| `decisionNote` | string | What's needed or what's blocking |
| `order`, `createdAt`, `updatedAt`, `example` | | `example: true` marks records that "Remove examples" deletes |

**Links**

| Field | Type | Notes |
|---|---|---|
| `jira`, `confluence` | string | A URL, a ticket key, or "interim". Only `https://` values become links. |
| `extraLinks[]` | `{label, url}` | |

**OKRs**

| Field | Type | Notes |
|---|---|---|
| `objectiveText` | string | |
| `krs[]` | object | See below |

Each item in `krs[]` has these fields:

- `n`: the name
- `base`, `now`, `target`: numbers
- `u`: the unit, which is `%`, `""` or `s` for seconds
- `until`: the date weekly tracking ends, Dec 31 by default
- `start`: the first week tracked
- `delivered`, `deliveredAt`
- `history[]`: one entry per week, `{w: Monday's date, v, conf: on|risk|off, note, by, at}`

**PRD**

| Field | Type | Notes |
|---|---|---|
| `text{key}`, `status{key}`, `need{key}` | strings | One entry per PRD section key. Status is `missing`, `draft`, `data`, `validation`, `info` or `ready`. |
| `stories[]` | `{id, as, want, so, priority, jira}` | |
| `reqs[]` | `{id, text, priority, state, criteria, jira}` | `priority` is must, should, could or wont. `state` is proposed, agreed, built or cut. |
| `deps[]` | `{id, what, team, due, state, jira}` | |
| `questions[]` | `{id, q, owner, due, state, answer}` | |
| `decisions[]` | `{id, what, why, who, date}` | |
| `approvals[]` | `{id, role, name, state, date, note}` | |

**Roadmap**

| Field | Type | Notes |
|---|---|---|
| `releases[]` | `{id, name, date, scope, status, jira, confluence}` | `status` is planned, building or shipped |
| `timeline[]` | `{date, label, state, jira, confluence}` | These are the milestones. `state` is done, next or planned. |

**Learning plan**

`learning[]` holds `{id, question, risk, method, signal, owner, due, status, result}`. `risk` is value, usability, feasibility, viability or other. `status` is planned, running or learned.

**Business readiness**

| Field | Type | Notes |
|---|---|---|
| `biz[]` | `{id, audience, group, expect, release, owner, date, status}` | `audience` is internal or external. `release` is a release id. `status` is todo, doing or ready. |
| `expectInternal`, `expectExternal` | string | The "what to expect" summaries |

**Today vs 2028**

| Field | Type | Notes |
|---|---|---|
| `journey` | `{today: [{t, s}], vision: [{t, s}]}` | Journey steps, each with an optional note |
| `screens` | `{today: [assetId], vision: [assetId]}` | Uploaded screen images |
| `prototypeUrl` | string | |

**Evidence**

| Field | Type | Notes |
|---|---|---|
| `files[]` | `{name, url or assetId, kind, label, ctx}` | `ctx` is Evidence, Today or 2028 |
| `draftedFrom[]` | file names | The documents Claude drafted from |

### `updates/{id}`

`{id, initiativeId, who, text, health, at}`. These are status updates posted on an initiative.

### `comments/{id}`

`{id, initiativeId, who, text, ctx, at}`. `ctx` is the PRD section or area the comment is about.

### `nodes/{id}`

This collection holds both site map pages and flows.

- **Page:** `{id, side: today|vision, name, path, change, parent, type, platform, notes, initiatives[], order}`
  - `change` is `keep` or `removed` for today's pages, and `new`, `improved` or `unchanged` for 2028 pages.
  - `parent` is the id of the parent page. An empty `parent` means a top-level page.
  - `type` is page, area, modal, state or external.
  - `platform` is both, app or web.
- **Flow:** `{id, kind: "flow", side, name, notes, initiatives[], steps: [{node, t, s}], order}`
  - `node` is the id of the page the step happens on.
  - `t` is the step's own name, used when it doesn't match a page yet.
  - `s` is a note on the step.

### Suggested tables for Postgres

The prd-hub Prisma schema can grow into this. Keep the core fields on `Initiative`, and give each list above its own table with an `initiativeId` and an `order`:

- `KeyResult`
- `KrCheckin`, unique on `(keyResultId, week)`
- `Release`, `Milestone`
- `LearningItem`, `ReadinessItem`
- `Story`, `Requirement`, `Dependency`, `Question`, `Decision`, `Approval`
- `PrdSection`, unique on `(initiativeId, key)`
- `Update`, `Comment`
- `SitemapNode`, `Flow`, `FlowStep`

`example-data.json` maps straight onto these tables.

## PRD section keys

There are 32 sections in 7 groups. The full list, with each section's guiding question, is the `SECTIONS` constant near the top of the script.

| Group | Section keys |
|---|---|
| Summary | `tldr`, `background`, `goals` |
| Opportunity | `problem`, `customer`, `size`, `alternatives`, `whyus`, `whynow`, `gtm`, `metrics`, `factors`, `rec` |
| Users & requirements | `stories`, `reqs`, `nfr`, `scope` |
| Solution | `solution`, `ux`, `rules`, `analytics` |
| Delivery | `deps`, `launch`, `ops`, `legal` |
| Risks | `value`, `usability`, `feasibility`, `viability` |
| Decisions & sign-off | `questions`, `decisions`, `approvals` |

PRD readiness is the share of sections marked `ready`.

## Rules worth keeping when you port

- **Weekly key result updates**
  - A key result needs an update when it isn't delivered, today is on or before its `until` date, and it has no history entry for this week. A week starts on Monday.
  - The first value entered becomes the baseline if there isn't one.
  - "Pace" draws a straight line from the baseline at `start` to the target at `until`. It shows whether the latest value is ahead of that line or behind it.
- **Importing milestones**
  - Each row is split on tabs, `|`, `;` or commas, and quoted CSV works.
  - In each row, the app finds:
    - the date
    - the state: done, next or planned
    - the word `release`
    - Jira keys like `ABC-123`, and Jira or Confluence URLs
    - on the global Roadmap page, an initiative's name
  - What's left of the row becomes the label and the details.
  - Dates can be written as `2027-01-12`, `1/12/2027`, `Jan 12`, `March 2027` or `Q2 2027`. A date with no year that would fall more than six months in the past is read as next year.
- **Importing a site map outline:** each indent is one level deeper, and a line reads `Name | /path | type`.
- **Only one milestone can be "next".** When one is set to next, the others go back to planned, and the initiative's `next` field updates to match.

## Reading documents with Claude

1. "New initiative" and "Add documents" take PDF, Word, text, Markdown, CSV and image files.
2. The browser pulls out the text and sends one prompt that asks for a single JSON object with these keys:
   - `name`, `goal`, `team`, `objective`, `keyResults`, `exists`, `phase`
   - `sections{key:{text,status,need}}`
   - `stories`, `requirements`, `dependencies`, `openQuestions`, `decisions`
   - `milestones`, `releases`, `learningPlan`
   - `readiness{internalSummary, externalSummary, items}`
   - `journey`

   The function `draftFromDocs` holds the exact prompt. The function `cleanDraft` checks and trims every field before anything is saved, so keep it on the server side.
3. Milestone import from documents uses a smaller prompt, in `rowsFromDocs`.

To run this yourself, add a server route such as `POST /api/draft` that takes the files and does three things:

- extracts the text, using pdf-parse and mammoth on the server
- calls the Anthropic Messages API with the same prompt, from a recent Claude Sonnet or Opus model
- returns the JSON

Keep the API key on the server.

## Steps to integrate into prd-hub

1. Open `initiative-hub-local-demo.html` to see the target experience. The current code on `first-version` (draft PR #1 in `santiago2692/prd-hub`) has the older design and fewer features.
2. Extend `prisma/schema.prisma` with the tables above, then seed it from `example-data.json`.
3. Port the views one at a time into React server components, reusing the CSS from the `<style>` block as-is. The colours are variables on `:root` and include dark mode.
4. Replace the platform services with server actions:
   - `write(path, data, merge)` becomes create or update actions.
   - `onSnapshot` becomes a fetch plus revalidation, or polling every 30 seconds.
5. Add the `/api/draft` route for reading documents.
6. Use the prd-hub NextAuth setup for Google sign-in and roles. Editors can change everything, and Viewers can comment.
7. Upload files to cloud storage. Local disk works for development.
8. Optional: replace the "interim" Jira and Confluence fields with real links by calling the Atlassian APIs to check that a key exists and to fetch its status.

## Testing

`local-test-mock.js` is a drop-in stand-in for the platform services. To use it in a Playwright test, call `page.addInitScript({ path: 'local-test-mock.js' })` before opening the HTML. The flows that were tested end to end with it:

- creating an initiative from a PDF and a Markdown file
- key results and weekly updates, including backfilling a missed week
- releases, milestone import from rows and from documents, and Jira and Confluence links
- the learning plan
- business readiness and sharing its summary
- PRD lists and Copy as Markdown
- the site map diagram, search, flows and outline import
- comments
- loading and removing the examples

Real calls to Claude and real file uploads have not been tested outside the claude.ai page.
