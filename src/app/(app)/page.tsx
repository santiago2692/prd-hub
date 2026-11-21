import Link from "next/link";
import type { Stage } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { computeReadiness, STAGE_LABEL } from "@/lib/status";
import { AutoRefresh } from "@/components/client";
import { Empty, ProgressBar, StatusBadge, timeAgo } from "@/components/ui";

const STAGES = Object.keys(STAGE_LABEL) as Stage[];

export default async function Portfolio({ searchParams }: { searchParams: Promise<{ stage?: string; mine?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const stage = STAGES.includes(sp.stage as Stage) ? (sp.stage as Stage) : undefined;
  const mine = sp.mine === "1";

  const [projects, activity] = await Promise.all([
    db.project.findMany({
      where: { stage, ownerId: mine ? me.id : undefined },
      include: {
        owner: true,
        sections: { select: { key: true, status: true, note: true } },
        _count: { select: { comments: { where: { resolved: false } }, attachments: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.activity.findMany({ include: { actor: true, project: true }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);

  const rows = projects.map((p) => ({ p, r: computeReadiness(p.sections) }));
  const tally = rows.reduce<Record<string, number>>((acc, { r }) => ((acc[r.label] = (acc[r.label] ?? 0) + 1), acc), {});

  const href = (q: { stage?: string; mine?: boolean }) => {
    const params = new URLSearchParams();
    if (q.stage) params.set("stage", q.stage);
    if (q.mine) params.set("mine", "1");
    const s = params.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <AutoRefresh />
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Projects</h1>
            <p className="text-sm text-zinc-500">
              {projects.length} project{projects.length === 1 ? "" : "s"}
              {Object.entries(tally).map(([label, n]) => ` · ${n} ${label.toLowerCase()}`)}
            </p>
          </div>
          {hasRole(me, "EDITOR") && (
            <Link href="/projects/new" className="btn">
              New project
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={href({ mine })} className={!stage ? "btn" : "btn-ghost"}>All stages</Link>
          {STAGES.map((s) => (
            <Link key={s} href={href({ stage: s, mine })} className={stage === s ? "btn" : "btn-ghost"}>
              {STAGE_LABEL[s]}
            </Link>
          ))}
          <Link href={href({ stage, mine: !mine })} className={`${mine ? "btn" : "btn-ghost"} ml-auto`}>
            {mine ? "Showing mine" : "Only mine"}
          </Link>
        </div>

        {rows.length === 0 ? (
          <Empty>No projects yet. {hasRole(me, "EDITOR") ? "Start one with New project." : "Editors can create the first one."}</Empty>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map(({ p, r }) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="card block space-y-3 p-4 hover:border-indigo-300">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{p.title}</h2>
                    <p className="text-xs text-zinc-500">
                      {p.owner.name ?? p.owner.email}
                      {p.team && ` · ${p.team}`} · {STAGE_LABEL[p.stage]} · updated {timeAgo(p.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge status={r.tone} label={r.label} />
                </div>
                {p.summary && <p className="line-clamp-2 text-sm text-zinc-600">{p.summary}</p>}
                <div className="space-y-1">
                  <ProgressBar percent={r.percent} />
                  <p className="text-xs text-zinc-500">
                    {r.ready}/{r.total} ready · {p._count.attachments} docs · {p._count.comments} open comments
                  </p>
                </div>
                {r.gaps.length > 0 && (
                  <p className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-700">Still needed:</span>{" "}
                    {r.gaps.slice(0, 4).map((g) => g.title).join(", ")}
                    {r.gaps.length > 4 && ` +${r.gaps.length - 4} more`}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <aside className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Latest activity</h2>
        <ul className="card divide-y divide-zinc-100 text-sm">
          {activity.length === 0 && <li className="p-3 text-zinc-500">Nothing yet.</li>}
          {activity.map((a) => (
            <li key={a.id} className="p-3">
              <span className="font-medium">{a.actor.name ?? a.actor.email}</span> {a.message}
              {a.project && (
                <>
                  {" "}in{" "}
                  <Link href={`/projects/${a.project.id}`} className="link">
                    {a.project.title}
                  </Link>
                </>
              )}
              <div className="text-xs text-zinc-400">{timeAgo(a.createdAt)}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
