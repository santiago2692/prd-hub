import Link from "next/link";
import type { Comment, MapVersion, NodeChange, Project, SiteMapNode, User } from "@prisma/client";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { createNode, deleteNode, updateNode } from "@/lib/actions";
import { AutoRefresh, ConfirmButton, SubmitButton } from "@/components/client";
import { Comments } from "@/components/Comments";
import { CHANGE_LABEL, ChangeBadge, Empty } from "@/components/ui";

type Node = SiteMapNode & {
  projects: Pick<Project, "id" | "title">[];
  comments: (Comment & { author: User })[];
  counterpart: SiteMapNode | null;
};

export default async function SiteMapPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const me = await requireUser();
  const { view } = await searchParams;
  const canEdit = hasRole(me, "EDITOR");
  const [nodes, projects] = await Promise.all([
    db.siteMapNode.findMany({
      include: { projects: { select: { id: true, title: true } }, comments: { include: { author: true }, orderBy: { createdAt: "asc" } }, counterpart: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    db.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const today = nodes.filter((n) => n.version === "TODAY");
  const vision = nodes.filter((n) => n.version === "VISION");
  const ctx = { canEdit, me, projects, today, all: nodes };

  const counts = vision.reduce<Partial<Record<NodeChange, number>>>((a, n) => ((a[n.change] = (a[n.change] ?? 0) + 1), a), {});
  const removed = today.filter((n) => n.change === "REMOVE").length;

  return (
    <div className="space-y-6">
      <AutoRefresh />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Site map</h1>
          <p className="text-sm text-zinc-500">
            Today: {today.length} pages · 2028: {vision.length} pages ({counts.NEW ?? 0} new, {counts.IMPROVED ?? 0} improved,{" "}
            {counts.UNCHANGED ?? 0} unchanged) · {removed} removed
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/sitemap" className={view !== "changes" ? "btn" : "btn-ghost"}>Side by side</Link>
          <Link href="/sitemap?view=changes" className={view === "changes" ? "btn" : "btn-ghost"}>Change list</Link>
        </div>
      </div>

      {view === "changes" ? (
        <ChangeList today={today} vision={vision} />
      ) : (
        <>
          {today.length === 0 && (
            <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
              There's no current site map yet, so the 2028 map shows on its own. {canEdit && "Add today's pages on the left as you map them."}
            </p>
          )}
          <div className={`grid gap-4 ${today.length ? "lg:grid-cols-2" : "lg:grid-cols-[320px_1fr]"}`}>
            <MapColumn version="TODAY" title="Today" nodes={today} ctx={ctx} />
            <MapColumn version="VISION" title="2028 vision" nodes={vision} ctx={ctx} />
          </div>
        </>
      )}
    </div>
  );
}

type Ctx = { canEdit: boolean; me: User; projects: Pick<Project, "id" | "title">[]; today: Node[]; all: Node[] };

function MapColumn({ version, title, nodes, ctx }: { version: MapVersion; title: string; nodes: Node[]; ctx: Ctx }) {
  const roots = nodes.filter((n) => !n.parentId);
  return (
    <section className={`space-y-3 rounded-lg border-t-4 bg-white p-4 shadow-sm ${version === "TODAY" ? "border-zinc-400" : "border-indigo-500"}`}>
      <h2 className="font-semibold">{title}</h2>
      {nodes.length === 0 ? (
        <Empty>{version === "TODAY" ? "No current pages mapped." : "No 2028 pages yet."}</Empty>
      ) : (
        <ul className="space-y-1">
          {roots.map((n) => (
            <Tree key={n.id} node={n} nodes={nodes} ctx={ctx} />
          ))}
        </ul>
      )}
      {ctx.canEdit && (
        <details data-editing className="rounded-md border border-dashed border-zinc-300 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-700">Add a page</summary>
          <form action={createNode} className="mt-3">
            <NodeFields version={version} nodes={nodes} ctx={ctx} />
            <SubmitButton>Add page</SubmitButton>
          </form>
        </details>
      )}
    </section>
  );
}

function Tree({ node, nodes, ctx }: { node: Node; nodes: Node[]; ctx: Ctx }) {
  const children = nodes.filter((n) => n.parentId === node.id);
  const openComments = node.comments.filter((c) => !c.resolved).length;
  return (
    <li id={node.id} className="scroll-mt-4">
      <details className="group rounded-md hover:bg-zinc-50" data-editing>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-2 py-1.5 text-sm">
          <span className={node.change === "REMOVE" ? "text-zinc-400 line-through" : "font-medium"}>{node.title}</span>
          {node.path && <code className="text-xs text-zinc-500">{node.path}</code>}
          <ChangeBadge change={node.change} />
          {node.counterpart && <span className="text-xs text-zinc-500">replaces {node.counterpart.title}</span>}
          {openComments > 0 && <span className="text-xs text-amber-700">{openComments} comments</span>}
          {node.projects.length > 0 && (
            <span className="text-xs text-indigo-700">{node.projects.map((p) => p.title).join(", ")}</span>
          )}
        </summary>
        <div className="space-y-3 border-l-2 border-indigo-100 px-3 pb-3 pt-1 text-sm">
          {node.description && <p className="whitespace-pre-wrap text-zinc-700">{node.description}</p>}
          {node.prototypeUrl && (
            <a href={node.prototypeUrl} target="_blank" rel="noreferrer noopener" className="link text-xs">Open in prototype</a>
          )}
          {node.projects.length > 0 && (
            <p className="text-xs">
              Projects:{" "}
              {node.projects.map((p, i) => (
                <span key={p.id}>
                  {i > 0 && ", "}
                  <Link href={`/projects/${p.id}`} className="link">{p.title}</Link>
                </span>
              ))}
            </p>
          )}
          <Comments comments={node.comments} target={{ siteMapNodeId: node.id }} returnTo="/sitemap" me={ctx.me} compact />
          {ctx.canEdit && (
            <details className="rounded-md border border-zinc-200 p-3">
              <summary className="cursor-pointer text-xs font-medium text-indigo-700">Edit page</summary>
              <form action={updateNode} className="mt-3">
                <input type="hidden" name="id" value={node.id} />
                <NodeFields version={node.version} nodes={nodes.filter((n) => n.id !== node.id)} ctx={ctx} node={node} />
                <SubmitButton>Save</SubmitButton>
              </form>
              <form action={deleteNode} className="mt-2">
                <input type="hidden" name="id" value={node.id} />
                <ConfirmButton message={`Delete "${node.title}" and all its sub-pages?`}>Delete page</ConfirmButton>
              </form>
            </details>
          )}
        </div>
      </details>
      {children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l border-zinc-200 pl-2">
          {children.map((c) => (
            <Tree key={c.id} node={c} nodes={nodes} ctx={ctx} />
          ))}
        </ul>
      )}
    </li>
  );
}

function NodeFields({ version, nodes, ctx, node }: { version: MapVersion; nodes: Node[]; ctx: Ctx; node?: Node }) {
  const changes: NodeChange[] = version === "TODAY" ? ["KEEP", "REMOVE"] : ["NEW", "IMPROVED", "UNCHANGED"];
  return (
    <div className="mb-3 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="version" value={version} />
      <div>
        <label className="label">Page name</label>
        <input name="title" required defaultValue={node?.title} className="input" placeholder="e.g. Checkout" />
      </div>
      <div>
        <label className="label">URL path</label>
        <input name="path" defaultValue={node?.path} className="input" placeholder="/checkout" />
      </div>
      <div>
        <label className="label">Parent page</label>
        <select name="parentId" defaultValue={node?.parentId ?? ""} className="input">
          <option value="">Top level</option>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>{n.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{version === "TODAY" ? "In 2028" : "Change"}</label>
        <select name="change" defaultValue={node?.change ?? changes[0]} className="input">
          {changes.map((c) => (
            <option key={c} value={c}>{CHANGE_LABEL[c]}</option>
          ))}
        </select>
      </div>
      {version === "VISION" && (
        <div>
          <label className="label">Replaces current page</label>
          <select name="counterpartId" defaultValue={node?.counterpartId ?? ""} className="input">
            <option value="">None (new page)</option>
            {ctx.today.map((n) => (
              <option key={n.id} value={n.id}>{n.title}</option>
            ))}
          </select>
        </div>
      )}
      {version === "VISION" && (
        <div>
          <label className="label">Prototype link</label>
          <input name="prototypeUrl" type="url" defaultValue={node?.prototypeUrl ?? ""} className="input" placeholder="https://…" />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label">Notes</label>
        <textarea name="description" rows={2} defaultValue={node?.description} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Projects that touch this page (Ctrl/Cmd-click for several)</label>
        <select name="projectIds" multiple defaultValue={node?.projects.map((p) => p.id) ?? []} className="input h-24">
          {ctx.projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ChangeList({ today, vision }: { today: Node[]; vision: Node[] }) {
  const removed = today.filter((t) => t.change === "REMOVE");
  const rows = [
    ...vision.map((v) => ({ id: v.id, today: v.counterpart?.title ?? null, change: v.change, vision: v.title, projects: v.projects })),
    ...removed.map((t) => ({ id: t.id, today: t.title, change: "REMOVE" as NodeChange, vision: null, projects: t.projects })),
  ];
  if (!rows.length) return <Empty>No pages yet.</Empty>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
          <tr>
            <th className="p-2 pl-4">Today</th>
            <th className="p-2">Change</th>
            <th className="p-2">2028</th>
            <th className="p-2">Projects</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="p-2 pl-4">{r.today ?? <span className="text-zinc-400">Nothing today</span>}</td>
              <td className="p-2"><ChangeBadge change={r.change} /></td>
              <td className="p-2">{r.vision ?? <span className="text-zinc-400">Removed</span>}</td>
              <td className="p-2 text-xs">
                {r.projects.map((p, i) => (
                  <span key={p.id}>
                    {i > 0 && ", "}
                    <Link href={`/projects/${p.id}`} className="link">{p.title}</Link>
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
