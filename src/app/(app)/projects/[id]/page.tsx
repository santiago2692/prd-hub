import Link from "next/link";
import { notFound } from "next/navigation";
import type { SectionStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { CAGAN_SECTIONS, GROUPS, type SectionGroup } from "@/lib/cagan";
import { computeReadiness, SECTION_STATUS_LABEL, STAGE_LABEL } from "@/lib/status";
import { deleteProject, saveSection, updateProject } from "@/lib/actions";
import { AutoRefresh, ConfirmButton, SubmitButton } from "@/components/client";
import { AddAttachment, AttachmentList } from "@/components/Attachments";
import { Comments } from "@/components/Comments";
import { ChangeBadge, Empty, ProgressBar, StatusBadge, timeAgo } from "@/components/ui";
import { CompareTab } from "./CompareTab";

const TABS = [
  { id: "prd", label: "PRD" },
  { id: "compare", label: "Today vs 2028" },
  { id: "files", label: "Docs & files" },
  { id: "activity", label: "Activity" },
  { id: "settings", label: "Settings" },
] as const;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const me = await requireUser();
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const canEdit = hasRole(me, "EDITOR");
  const tab = TABS.find((t) => t.id === rawTab && (t.id !== "settings" || canEdit))?.id ?? "prd";

  const project = await db.project.findUnique({
    where: { id },
    include: {
      owner: true,
      sections: { include: { updatedBy: true } },
      attachments: { include: { uploadedBy: true }, orderBy: { createdAt: "desc" } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      activities: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 50 },
      siteMapNodes: { include: { counterpart: true }, orderBy: [{ version: "asc" }, { order: "asc" }] },
      journeys: { include: { counterpart: true, _count: { select: { steps: true } } } },
    },
  });
  if (!project) notFound();

  const readiness = computeReadiness(project.sections);
  const sectionsByKey = new Map(project.sections.map((s) => [s.key, s]));
  const base = `/projects/${project.id}`;
  const openComments = project.comments.filter((c) => !c.resolved).length;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-zinc-500">
              <Link href="/" className="link">Projects</Link> / {project.team || "No team"}
            </p>
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            <p className="text-sm text-zinc-500">
              Owner {project.owner.name ?? project.owner.email} · {STAGE_LABEL[project.stage]} · updated {timeAgo(project.updatedAt)}
            </p>
          </div>
          <div className="w-64 space-y-1 text-right">
            <StatusBadge status={readiness.tone} label={readiness.label} />
            <ProgressBar percent={readiness.percent} />
            <p className="text-xs text-zinc-500">
              {readiness.ready} of {readiness.total} checklist items ready · {openComments} open comments
            </p>
          </div>
        </div>
        {project.summary && <p className="max-w-3xl text-sm text-zinc-700">{project.summary}</p>}
        <nav className="flex gap-1 border-b border-zinc-200 text-sm">
          {TABS.filter((t) => t.id !== "settings" || canEdit).map((t) => (
            <Link
              key={t.id}
              href={t.id === "prd" ? base : `${base}?tab=${t.id}`}
              className={`-mb-px border-b-2 px-3 py-2 ${tab === t.id ? "border-indigo-600 font-medium text-indigo-700" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      {tab === "prd" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="space-y-8">
            {(Object.keys(GROUPS) as SectionGroup[]).map((g) => (
              <section key={g} className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold">{GROUPS[g].title}</h2>
                  <p className="text-sm text-zinc-500">{GROUPS[g].blurb}</p>
                </div>
                {CAGAN_SECTIONS.filter((c) => c.group === g).map((c) => {
                  const s = sectionsByKey.get(c.key);
                  const status: SectionStatus = s?.status ?? "MISSING";
                  const files = project.attachments.filter((a) => a.sectionKey === c.key);
                  const comments = project.comments.filter((cm) => cm.sectionKey === c.key);
                  return (
                    <article key={c.key} id={c.key} className="card scroll-mt-4 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium">{c.title}</h3>
                          <p className="text-sm text-zinc-500">{c.question}</p>
                        </div>
                        <StatusBadge status={status} />
                      </div>

                      {s?.content ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{s.content}</p>
                      ) : (
                        <p className="mt-3 text-sm italic text-zinc-400">Not written yet.</p>
                      )}
                      {s?.note && status !== "READY" && (
                        <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">
                          <span className="font-medium">Still needed:</span> {s.note}
                        </p>
                      )}
                      {s?.updatedBy && (
                        <p className="mt-2 text-xs text-zinc-400">
                          Last edited by {s.updatedBy.name ?? s.updatedBy.email} {timeAgo(s.updatedAt)}
                        </p>
                      )}

                      {files.length > 0 && (
                        <div className="mt-3">
                          <AttachmentList items={files} canEdit={canEdit} />
                        </div>
                      )}

                      {canEdit && (
                        <details data-editing className="mt-3 rounded-md border border-zinc-200 p-3">
                          <summary className="cursor-pointer text-sm font-medium text-indigo-700">Edit this section</summary>
                          <div className="mt-3 grid gap-4 md:grid-cols-[1fr_220px]">
                            <form action={saveSection} className="space-y-3">
                              <input type="hidden" name="projectId" value={project.id} />
                              <input type="hidden" name="key" value={c.key} />
                              <textarea name="content" rows={7} defaultValue={s?.content ?? ""} className="input" placeholder={c.guidance.join("\n")} />
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <label className="label">Status</label>
                                  <select name="status" defaultValue={status} className="input">
                                    {(Object.keys(SECTION_STATUS_LABEL) as SectionStatus[]).map((st) => (
                                      <option key={st} value={st}>{SECTION_STATUS_LABEL[st]}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="label">What's still needed</label>
                                  <input name="note" defaultValue={s?.note ?? ""} className="input" placeholder="e.g. Baseline conversion from analytics" />
                                </div>
                              </div>
                              <SubmitButton>Save section</SubmitButton>
                            </form>
                            <div className="space-y-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
                              <p className="font-semibold uppercase tracking-wide text-zinc-500">Cagan's guidance</p>
                              <ul className="list-disc space-y-1 pl-4">
                                {c.guidance.map((gd) => <li key={gd}>{gd}</li>)}
                              </ul>
                              <p><span className="font-medium">Typical evidence:</span> {c.evidence}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <AddAttachment projectId={project.id} sectionKey={c.key} />
                          </div>
                        </details>
                      )}

                      <details className="mt-3" open={comments.some((cm) => !cm.resolved)}>
                        <summary className="cursor-pointer text-sm text-zinc-500">
                          Comments ({comments.filter((cm) => !cm.resolved).length})
                        </summary>
                        <div className="mt-2">
                          <Comments comments={comments} target={{ projectId: project.id, sectionKey: c.key }} returnTo={base} me={me} compact />
                        </div>
                      </details>
                    </article>
                  );
                })}
              </section>
            ))}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">What's still needed</h2>
              {readiness.gaps.length === 0 ? (
                <p className="text-sm text-emerald-700">Every checklist item is ready. Move it to review in Settings.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {readiness.gaps.map((gp) => (
                    <li key={gp.key}>
                      <a href={`#${gp.key}`} className="flex items-center justify-between gap-2 hover:text-indigo-700">
                        <span>{gp.title}</span>
                        <StatusBadge status={gp.status} />
                      </a>
                      {gp.note && <p className="text-xs text-zinc-500">{gp.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Project comments</h2>
              <Comments
                comments={project.comments.filter((c) => !c.sectionKey)}
                target={{ projectId: project.id }}
                returnTo={base}
                me={me}
                compact
              />
            </div>
          </aside>
        </div>
      )}

      {tab === "compare" && <CompareTab project={project} canEdit={canEdit} />}

      {tab === "files" && (
        <div className="space-y-4">
          {canEdit && <AddAttachment projectId={project.id} />}
          {project.attachments.length ? (
            <AttachmentList items={project.attachments} canEdit={canEdit} showSection />
          ) : (
            <Empty>No docs yet. Upload PDFs, images or docs, or link Google Docs and FigJam boards.</Empty>
          )}
          {project.journeys.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Linked journeys</h2>
              <ul className="space-y-1 text-sm">
                {project.journeys.map((j) => (
                  <li key={j.id}>
                    <Link href={`/journeys/${j.id}`} className="link">{j.title}</Link>{" "}
                    <span className="text-xs text-zinc-500">({j.version === "TODAY" ? "today" : "2028"}, {j._count.steps} steps)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {project.siteMapNodes.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-semibold">Site map pages this project touches</h2>
              <ul className="space-y-1 text-sm">
                {project.siteMapNodes.map((n) => (
                  <li key={n.id} className="flex items-center gap-2">
                    <Link href={`/sitemap#${n.id}`} className="link">{n.title}</Link>
                    <ChangeBadge change={n.change} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <ul className="card divide-y divide-zinc-100 text-sm">
          {project.activities.length === 0 && <li className="p-3 text-zinc-500">No activity yet.</li>}
          {project.activities.map((a) => (
            <li key={a.id} className="flex justify-between gap-3 p-3">
              <span>
                <span className="font-medium">{a.actor.name ?? a.actor.email}</span> {a.message}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">{a.createdAt.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}

      {tab === "settings" && canEdit && (
        <div className="grid gap-6 md:grid-cols-[1fr_280px]">
          <form action={updateProject} className="card space-y-4 p-4">
            <input type="hidden" name="id" value={project.id} />
            <div>
              <label className="label">Name</label>
              <input name="title" required defaultValue={project.title} className="input" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Team</label>
                <input name="team" defaultValue={project.team} className="input" />
              </div>
              <div>
                <label className="label">Stage</label>
                <select name="stage" defaultValue={project.stage} className="input">
                  {Object.entries(STAGE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Summary</label>
              <textarea name="summary" rows={4} defaultValue={project.summary} className="input" />
            </div>
            <div>
              <label className="label">2028 prototype link</label>
              <input name="prototypeUrl" type="url" defaultValue={project.prototypeUrl ?? ""} className="input" placeholder="https://prototype.yourcompany.com/onboarding" />
              <p className="mt-1 text-xs text-zinc-500">Shown live next to today's screens on the Today vs 2028 tab.</p>
            </div>
            <SubmitButton>Save</SubmitButton>
          </form>
          {(project.ownerId === me.id || me.role === "ADMIN") && (
            <form action={deleteProject} className="card h-fit space-y-2 p-4">
              <input type="hidden" name="id" value={project.id} />
              <h2 className="text-sm font-semibold">Delete project</h2>
              <p className="text-xs text-zinc-500">Removes the PRD, its files and comments. This can't be undone.</p>
              <ConfirmButton message={`Delete "${project.title}" and everything in it?`}>Delete project</ConfirmButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
