import Link from "next/link";
import { notFound } from "next/navigation";
import type { Journey, JourneyStep, SiteMapNode } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { deleteJourney, deleteStep, moveStep, saveStep, updateJourney } from "@/lib/actions";
import { AutoRefresh, ConfirmButton, SubmitButton } from "@/components/client";
import { Comments } from "@/components/Comments";
import { ChangeBadge, Empty } from "@/components/ui";

type Step = JourneyStep & { node: SiteMapNode | null };
type J = Journey & { steps: Step[] };

const stepsInclude = { steps: { include: { node: true }, orderBy: { order: "asc" as const } } };

export default async function JourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const canEdit = hasRole(me, "EDITOR");
  const { id } = await params;
  const journey = await db.journey.findUnique({
    where: { id },
    include: {
      ...stepsInclude,
      counterpart: { include: stepsInclude },
      successors: { include: stepsInclude },
      projects: { select: { id: true, title: true } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!journey) notFound();
  const [nodes, projects, todayJourneys] = await Promise.all([
    db.siteMapNode.findMany({ where: { version: journey.version }, orderBy: { title: "asc" } }),
    db.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.journey.findMany({ where: { version: "TODAY" }, orderBy: { title: "asc" } }),
  ]);

  const isVision = journey.version === "VISION";
  const today: J | null = isVision ? journey.counterpart : journey;
  const vision: J | null = isVision ? journey : (journey.successors[0] ?? null);

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div>
        <p className="text-xs text-zinc-500"><Link href="/journeys" className="link">Journeys</Link> / {isVision ? "2028" : "Today"}</p>
        <h1 className="text-2xl font-semibold">{journey.title}</h1>
        <p className="text-sm text-zinc-500">
          {journey.persona || "No persona set"}
          {journey.figjamUrl && (
            <> · <a href={journey.figjamUrl} target="_blank" rel="noreferrer noopener" className="link">Open in FigJam</a></>
          )}
          {journey.projects.length > 0 && (
            <> · Projects: {journey.projects.map((p, i) => (
              <span key={p.id}>{i > 0 && ", "}<Link href={`/projects/${p.id}`} className="link">{p.title}</Link></span>
            ))}</>
          )}
        </p>
      </div>

      <div className={`grid gap-4 ${today && vision ? "lg:grid-cols-2" : ""}`}>
        {today && <StepColumn title={`Today: ${today.title}`} j={today} tone="today" editable={canEdit && today.id === journey.id} nodes={nodes} />}
        {vision && <StepColumn title={`2028: ${vision.title}`} j={vision} tone="vision" editable={canEdit && vision.id === journey.id} nodes={nodes} />}
      </div>
      {isVision && !today && <p className="text-sm text-emerald-800">This journey doesn't exist today, so only the 2028 version is shown.</p>}
      {!isVision && !vision && <p className="text-sm text-zinc-500">No 2028 version yet. Create one and pick this journey under "Replaces".</p>}
      {(today?.id !== journey.id && today) || (vision?.id !== journey.id && vision) ? (
        <p className="text-xs text-zinc-500">
          Edit the other side on <Link href={`/journeys/${(today?.id !== journey.id ? today : vision)!.id}`} className="link">its own page</Link>.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Comments</h2>
          <Comments comments={journey.comments} target={{ journeyId: journey.id }} returnTo={`/journeys/${journey.id}`} me={me} />
        </div>
        {canEdit && (
          <details data-editing className="card p-4">
            <summary className="cursor-pointer text-sm font-semibold">Journey settings</summary>
            <form action={updateJourney} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={journey.id} />
              <input name="title" required defaultValue={journey.title} className="input" />
              <input name="persona" defaultValue={journey.persona} className="input" placeholder="Persona" />
              <input name="figjamUrl" type="url" defaultValue={journey.figjamUrl ?? ""} className="input" placeholder="FigJam link" />
              {isVision ? (
                <select name="counterpartId" defaultValue={journey.counterpartId ?? ""} className="input">
                  <option value="">Doesn't replace a current journey</option>
                  {todayJourneys.map((t) => <option key={t.id} value={t.id}>Replaces: {t.title}</option>)}
                </select>
              ) : (
                <input type="hidden" name="counterpartId" value="" />
              )}
              <label className="label">Projects</label>
              <select name="projectIds" multiple defaultValue={journey.projects.map((p) => p.id)} className="input h-24">
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <SubmitButton>Save</SubmitButton>
            </form>
            <form action={deleteJourney} className="mt-2">
              <input type="hidden" name="id" value={journey.id} />
              <ConfirmButton message="Delete this journey?">Delete journey</ConfirmButton>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}

function StepColumn({ title, j, tone, editable, nodes }: { title: string; j: J; tone: "today" | "vision"; editable: boolean; nodes: SiteMapNode[] }) {
  return (
    <section className={`space-y-3 rounded-lg border-t-4 bg-white p-4 shadow-sm ${tone === "today" ? "border-zinc-400" : "border-indigo-500"}`}>
      <h2 className="font-semibold">
        <Link href={`/journeys/${j.id}`} className="hover:underline">{title}</Link>
      </h2>
      {j.steps.length === 0 && <Empty>No steps yet.</Empty>}
      <ol className="space-y-2">
        {j.steps.map((s, i) => (
          <li key={s.id} className="rounded-md border border-zinc-200 p-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{s.title}</p>
                {s.description && <p className="whitespace-pre-wrap text-zinc-600">{s.description}</p>}
                {s.painPoint && <p className="text-xs text-red-700">Pain point: {s.painPoint}</p>}
                {s.node && (
                  <p className="flex items-center gap-2 text-xs">
                    <Link href={`/sitemap#${s.node.id}`} className="link">{s.node.title}</Link>
                    <ChangeBadge change={s.node.change} />
                  </p>
                )}
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <MoveButton id={s.id} dir="up" disabled={i === 0} />
                  <MoveButton id={s.id} dir="down" disabled={i === j.steps.length - 1} />
                </div>
              )}
            </div>
            {editable && (
              <details data-editing className="mt-2">
                <summary className="cursor-pointer text-xs text-indigo-700">Edit step</summary>
                <StepForm journeyId={j.id} step={s} nodes={nodes} />
                <form action={deleteStep}>
                  <input type="hidden" name="id" value={s.id} />
                  <ConfirmButton message="Delete this step?">Delete step</ConfirmButton>
                </form>
              </details>
            )}
          </li>
        ))}
      </ol>
      {editable && (
        <details data-editing className="rounded-md border border-dashed border-zinc-300 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">Add a step</summary>
          <StepForm journeyId={j.id} nodes={nodes} />
        </details>
      )}
    </section>
  );
}

function MoveButton({ id, dir, disabled }: { id: string; dir: "up" | "down"; disabled: boolean }) {
  return (
    <form action={moveStep}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="dir" value={dir} />
      <button disabled={disabled} aria-label={`Move ${dir}`} className="rounded px-1.5 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30">
        {dir === "up" ? "↑" : "↓"}
      </button>
    </form>
  );
}

function StepForm({ journeyId, step, nodes }: { journeyId: string; step?: Step; nodes: SiteMapNode[] }) {
  return (
    <form action={saveStep} className="mt-2 space-y-2">
      <input type="hidden" name="journeyId" value={journeyId} />
      <input type="hidden" name="id" value={step?.id ?? ""} />
      <input name="title" required defaultValue={step?.title} className="input" placeholder="What the user does" />
      <textarea name="description" rows={2} defaultValue={step?.description} className="input" placeholder="Details" />
      <input name="painPoint" defaultValue={step?.painPoint} className="input" placeholder="Pain point (optional)" />
      <select name="nodeId" defaultValue={step?.nodeId ?? ""} className="input">
        <option value="">No site map page</option>
        {nodes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
      </select>
      <SubmitButton className="btn-ghost">{step ? "Save step" : "Add step"}</SubmitButton>
    </form>
  );
}
