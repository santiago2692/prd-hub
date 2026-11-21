import Link from "next/link";
import type { Attachment, Journey, Project, SiteMapNode, User } from "@prisma/client";
import { AddAttachment, AttachmentList, fileHref, isImage } from "@/components/Attachments";
import { ChangeBadge, Empty } from "@/components/ui";

type Props = {
  project: Project & {
    attachments: (Attachment & { uploadedBy: User })[];
    siteMapNodes: (SiteMapNode & { counterpart: SiteMapNode | null })[];
    journeys: (Journey & { counterpart: Journey | null; _count: { steps: number } })[];
  };
  canEdit: boolean;
};

export function CompareTab({ project, canEdit }: Props) {
  const todayFiles = project.attachments.filter((a) => a.context === "TODAY");
  const visionFiles = project.attachments.filter((a) => a.context === "VISION");
  const visionNodes = project.siteMapNodes.filter((n) => n.version === "VISION");
  const todayNodeMap = new Map<string, SiteMapNode>();
  project.siteMapNodes.filter((n) => n.version === "TODAY").forEach((n) => todayNodeMap.set(n.id, n));
  visionNodes.forEach((n) => n.counterpart && todayNodeMap.set(n.counterpart.id, n.counterpart));
  const todayNodes = [...todayNodeMap.values()];
  const todayJourneys = project.journeys.filter((j) => j.version === "TODAY");
  const visionJourneys = project.journeys.filter((j) => j.version === "VISION");

  const hasToday = todayFiles.length + todayNodes.length + todayJourneys.length > 0;

  // One row per change: today page -> 2028 page.
  const rows: { today: SiteMapNode | null; vision: SiteMapNode | null }[] = [
    ...visionNodes.map((v) => ({ today: v.counterpart, vision: v as SiteMapNode })),
    ...todayNodes
      .filter((t) => t.change === "REMOVE" && !visionNodes.some((v) => v.counterpartId === t.id))
      .map((t) => ({ today: t, vision: null })),
  ];

  const vision = (
    <Column title="2028 vision" tone="vision">
      {project.prototypeUrl ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>Clickable prototype</span>
            <a href={project.prototypeUrl} target="_blank" rel="noreferrer noopener" className="link">Open full screen</a>
          </div>
          <iframe
            src={project.prototypeUrl}
            title="2028 prototype"
            className="h-[560px] w-full rounded-md border border-zinc-200 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <Empty>No prototype linked yet. {canEdit ? "Add the prototype link in Settings." : ""}</Empty>
      )}
      <Gallery files={visionFiles} canEdit={canEdit} />
      <NodeList nodes={visionNodes} />
      <JourneyList journeys={visionJourneys} />
    </Column>
  );

  return (
    <div className="space-y-6">
      {!hasToday && (
        <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          Nothing exists for this today, so everything below is new. Upload screenshots marked "Today" or link current site map pages if that's not right.
        </p>
      )}
      {hasToday ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Column title="Today" tone="today">
            <Gallery files={todayFiles} canEdit={canEdit} />
            <NodeList nodes={todayNodes} />
            <JourneyList journeys={todayJourneys} />
          </Column>
          {vision}
        </div>
      ) : (
        vision
      )}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="p-4 pb-2 text-sm font-semibold">What changes</h2>
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="p-2 pl-4">Today</th>
                <th className="p-2">Change</th>
                <th className="p-2">2028</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="p-2 pl-4">{r.today ? r.today.title : <span className="text-zinc-400">Nothing today</span>}</td>
                  <td className="p-2"><ChangeBadge change={r.vision ? r.vision.change : "REMOVE"} /></td>
                  <td className="p-2">{r.vision ? r.vision.title : <span className="text-zinc-400">Removed</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="card space-y-2 p-4">
          <h2 className="text-sm font-semibold">Add screens</h2>
          <p className="text-xs text-zinc-500">Choose "Today" for current screenshots and "2028 vision" for prototype frames.</p>
          <AddAttachment projectId={project.id} defaultContext="TODAY" />
          <p className="text-xs text-zinc-500">
            Link site map pages to this project on the <Link href="/sitemap" className="link">site map</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function Column({ title, tone, children }: { title: string; tone: "today" | "vision"; children: React.ReactNode }) {
  return (
    <section className={`space-y-4 rounded-lg border-t-4 bg-white p-4 shadow-sm ${tone === "today" ? "border-zinc-400" : "border-indigo-500"}`}>
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Gallery({ files, canEdit }: { files: (Attachment & { uploadedBy: User })[]; canEdit: boolean }) {
  const images = files.filter(isImage);
  const others = files.filter((f) => !isImage(f));
  return (
    <>
      {images.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {images.map((img) => (
            <a key={img.id} href={fileHref(img)} target="_blank" rel="noreferrer noopener" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileHref(img)} alt={img.name} className="w-full rounded-md ring-1 ring-zinc-200" />
              <span className="text-xs text-zinc-500">{img.name}</span>
            </a>
          ))}
        </div>
      )}
      <AttachmentList items={others} canEdit={canEdit} />
    </>
  );
}

function NodeList({ nodes }: { nodes: SiteMapNode[] }) {
  if (!nodes.length) return null;
  return (
    <div>
      <h3 className="label">Site map pages</h3>
      <ul className="space-y-1 text-sm">
        {nodes.map((n) => (
          <li key={n.id} className="flex items-center gap-2">
            <Link href={`/sitemap#${n.id}`} className="link">{n.title}</Link>
            {n.path && <code className="text-xs text-zinc-500">{n.path}</code>}
            <ChangeBadge change={n.change} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function JourneyList({ journeys }: { journeys: (Journey & { _count: { steps: number } })[] }) {
  if (!journeys.length) return null;
  return (
    <div>
      <h3 className="label">Journeys</h3>
      <ul className="space-y-1 text-sm">
        {journeys.map((j) => (
          <li key={j.id}>
            <Link href={`/journeys/${j.id}`} className="link">{j.title}</Link>{" "}
            <span className="text-xs text-zinc-500">{j._count.steps} steps</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
