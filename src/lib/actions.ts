"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AttachmentContext, MapVersion, NodeChange, Role, SectionStatus, Stage } from "@prisma/client";
import { db } from "./db";
import { requireRole } from "./auth";
import { CAGAN_SECTIONS, SECTION_BY_KEY } from "./cagan";
import { sectionTitle, SECTION_STATUS_LABEL, STAGE_LABEL } from "./status";
import { deleteStoredFile, MAX_UPLOAD_BYTES, mimeAllowed, saveFile } from "./storage";

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link");
const optionalUrl = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(httpUrl.nullable());

const STAGES = ["DRAFT", "IN_REVIEW", "APPROVED", "IN_BUILD", "SHIPPED", "PARKED"] as const;
const STATUSES = ["MISSING", "DRAFT", "NEEDS_INFO", "NEEDS_DATA", "NEEDS_VALIDATION", "READY"] as const;
const CONTEXTS = ["GENERAL", "TODAY", "VISION"] as const;
const VERSIONS = ["TODAY", "VISION"] as const;
const CHANGES = ["KEEP", "REMOVE", "NEW", "IMPROVED", "UNCHANGED"] as const;

function str(fd: FormData, k: string) {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
}

async function log(actorId: string, message: string, projectId?: string | null) {
  await db.activity.create({ data: { actorId, message, projectId: projectId ?? null } });
}

// ---------- Projects ----------

export async function createProject(fd: FormData) {
  const user = await requireRole("EDITOR");
  const data = z
    .object({ title: z.string().trim().min(1).max(200), summary: z.string().max(5000), team: z.string().max(100) })
    .parse({ title: str(fd, "title"), summary: str(fd, "summary"), team: str(fd, "team") });
  const project = await db.project.create({
    data: {
      ...data,
      ownerId: user.id,
      sections: { create: CAGAN_SECTIONS.map((s) => ({ key: s.key })) },
    },
  });
  await log(user.id, `created the project "${project.title}"`, project.id);
  redirect(`/projects/${project.id}`);
}

export async function updateProject(fd: FormData) {
  const user = await requireRole("EDITOR");
  const data = z
    .object({
      id: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      summary: z.string().max(5000),
      team: z.string().max(100),
      stage: z.enum(STAGES),
      prototypeUrl: optionalUrl,
    })
    .parse({
      id: str(fd, "id"),
      title: str(fd, "title"),
      summary: str(fd, "summary"),
      team: str(fd, "team"),
      stage: str(fd, "stage"),
      prototypeUrl: str(fd, "prototypeUrl"),
    });
  const before = await db.project.findUniqueOrThrow({ where: { id: data.id } });
  const { id, ...rest } = data;
  await db.project.update({ where: { id }, data: { ...rest, stage: rest.stage as Stage } });
  await log(
    user.id,
    before.stage !== data.stage
      ? `moved the project to ${STAGE_LABEL[data.stage as Stage]}`
      : "updated the project details",
    id,
  );
  revalidatePath(`/projects/${id}`);
  revalidatePath("/");
}

export async function deleteProject(fd: FormData) {
  const user = await requireRole("EDITOR");
  const id = str(fd, "id");
  const project = await db.project.findUniqueOrThrow({ where: { id }, include: { attachments: true } });
  if (project.ownerId !== user.id && user.role !== "ADMIN") throw new Error("Only the owner or an admin can delete");
  await Promise.all(project.attachments.filter((a) => a.storageKey).map((a) => deleteStoredFile(a.storageKey!)));
  await db.project.delete({ where: { id } });
  await log(user.id, `deleted the project "${project.title}"`);
  redirect("/");
}

export async function saveSection(fd: FormData) {
  const user = await requireRole("EDITOR");
  const data = z
    .object({
      projectId: z.string().min(1),
      key: z.string().refine((k) => k in SECTION_BY_KEY, "Unknown section"),
      content: z.string().max(50000),
      status: z.enum(STATUSES),
      note: z.string().max(1000),
    })
    .parse({
      projectId: str(fd, "projectId"),
      key: str(fd, "key"),
      content: str(fd, "content"),
      status: str(fd, "status"),
      note: str(fd, "note"),
    });
  const prev = await db.prdSection.findUnique({ where: { projectId_key: { projectId: data.projectId, key: data.key } } });
  // Writing content into an empty section moves it to Draft automatically.
  let status = data.status as SectionStatus;
  if (status === "MISSING" && data.content.trim()) status = "DRAFT";
  await db.prdSection.upsert({
    where: { projectId_key: { projectId: data.projectId, key: data.key } },
    update: { content: data.content, status, note: data.note, updatedById: user.id },
    create: { projectId: data.projectId, key: data.key, content: data.content, status, note: data.note, updatedById: user.id },
  });
  await db.project.update({ where: { id: data.projectId }, data: { updatedAt: new Date() } });
  const title = sectionTitle(data.key);
  await log(
    user.id,
    prev?.status !== status ? `marked "${title}" as ${SECTION_STATUS_LABEL[status]}` : `edited "${title}"`,
    data.projectId,
  );
  revalidatePath(`/projects/${data.projectId}`);
}

// ---------- Attachments ----------

function parseContext(v: string): AttachmentContext {
  return (CONTEXTS as readonly string[]).includes(v) ? (v as AttachmentContext) : "GENERAL";
}

export async function addLink(fd: FormData) {
  const user = await requireRole("EDITOR");
  const projectId = str(fd, "projectId");
  const url = httpUrl.parse(str(fd, "url"));
  const name = str(fd, "name").trim() || new URL(url).hostname;
  const sectionKey = str(fd, "sectionKey") || null;
  await db.attachment.create({
    data: { projectId, kind: "LINK", url, name, sectionKey, context: parseContext(str(fd, "context")), uploadedById: user.id },
  });
  await log(user.id, `linked "${name}"${sectionKey ? ` to "${sectionTitle(sectionKey)}"` : ""}`, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function uploadFiles(fd: FormData) {
  const user = await requireRole("EDITOR");
  const projectId = str(fd, "projectId");
  await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const sectionKey = str(fd, "sectionKey") || null;
  const context = parseContext(str(fd, "context"));
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) throw new Error("Choose at least one file");
  for (const file of files) {
    if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name} is over 25 MB`);
    const mime = file.type || "application/octet-stream";
    if (!mimeAllowed(mime)) throw new Error(`${file.name}: this file type isn't supported`);
    const storageKey = await saveFile(Buffer.from(await file.arrayBuffer()));
    await db.attachment.create({
      data: {
        projectId,
        kind: "FILE",
        name: file.name.slice(0, 255),
        storageKey,
        mimeType: mime,
        size: file.size,
        sectionKey,
        context,
        uploadedById: user.id,
      },
    });
  }
  await log(user.id, `uploaded ${files.length === 1 ? `"${files[0].name}"` : `${files.length} files`}`, projectId);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteAttachment(fd: FormData) {
  const user = await requireRole("EDITOR");
  const a = await db.attachment.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  if (a.storageKey) await deleteStoredFile(a.storageKey);
  await db.attachment.delete({ where: { id: a.id } });
  await log(user.id, `removed "${a.name}"`, a.projectId);
  revalidatePath(`/projects/${a.projectId}`);
}

// ---------- Comments (anyone signed in) ----------

export async function addComment(fd: FormData) {
  const user = await requireRole("VIEWER");
  const body = z.string().trim().min(1).max(5000).parse(str(fd, "body"));
  const projectId = str(fd, "projectId") || null;
  const sectionKey = str(fd, "sectionKey") || null;
  const siteMapNodeId = str(fd, "siteMapNodeId") || null;
  const journeyId = str(fd, "journeyId") || null;
  if (!projectId && !siteMapNodeId && !journeyId) throw new Error("Nothing to comment on");
  await db.comment.create({ data: { body, authorId: user.id, projectId, sectionKey, siteMapNodeId, journeyId } });
  if (projectId) {
    await log(user.id, `commented on ${sectionKey ? `"${sectionTitle(sectionKey)}"` : "the project"}`, projectId);
  }
  revalidatePath(str(fd, "returnTo") || "/");
}

export async function toggleCommentResolved(fd: FormData) {
  const user = await requireRole("VIEWER");
  const c = await db.comment.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  if (c.authorId !== user.id && user.role === "VIEWER") throw new Error("Only editors or the author can resolve");
  await db.comment.update({ where: { id: c.id }, data: { resolved: !c.resolved } });
  revalidatePath(str(fd, "returnTo") || "/");
}

// ---------- Site map ----------

const nodeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  path: z.string().trim().max(300),
  description: z.string().max(5000),
  version: z.enum(VERSIONS),
  change: z.enum(CHANGES),
  parentId: z.string().transform((v) => v || null),
  counterpartId: z.string().transform((v) => v || null),
  prototypeUrl: optionalUrl,
  projectIds: z.array(z.string()),
});

function readNode(fd: FormData) {
  return nodeSchema.parse({
    title: str(fd, "title"),
    path: str(fd, "path"),
    description: str(fd, "description"),
    version: str(fd, "version"),
    change: str(fd, "change"),
    parentId: str(fd, "parentId"),
    counterpartId: str(fd, "counterpartId"),
    prototypeUrl: str(fd, "prototypeUrl"),
    projectIds: fd.getAll("projectIds").map(String).filter(Boolean),
  });
}

async function checkNodeLinks(version: MapVersion, change: NodeChange, parentId: string | null, counterpartId: string | null, selfId?: string) {
  const allowed: NodeChange[] = version === "TODAY" ? ["KEEP", "REMOVE"] : ["NEW", "IMPROVED", "UNCHANGED"];
  if (!allowed.includes(change)) throw new Error("That change type doesn't fit this version");
  if (parentId) {
    if (parentId === selfId) throw new Error("A page can't be its own parent");
    const parent = await db.siteMapNode.findUniqueOrThrow({ where: { id: parentId } });
    if (parent.version !== version) throw new Error("Parent must be in the same site map");
    // Walk up to stop cycles.
    let cur: string | null = parent.parentId;
    while (cur) {
      if (cur === selfId) throw new Error("That would create a loop");
      cur = (await db.siteMapNode.findUnique({ where: { id: cur } }))?.parentId ?? null;
    }
  }
  if (counterpartId) {
    if (version !== "VISION") throw new Error("Only 2028 pages link to a current page");
    const cp = await db.siteMapNode.findUniqueOrThrow({ where: { id: counterpartId } });
    if (cp.version !== "TODAY") throw new Error("Counterpart must be a current page");
  }
  if (version === "VISION" && change === "NEW" && counterpartId) throw new Error("A new page has no current counterpart");
}

export async function createNode(fd: FormData) {
  const user = await requireRole("EDITOR");
  const d = readNode(fd);
  const version = d.version as MapVersion;
  const change = d.change as NodeChange;
  await checkNodeLinks(version, change, d.parentId, d.counterpartId);
  const order = await db.siteMapNode.count({ where: { version, parentId: d.parentId } });
  await db.siteMapNode.create({
    data: {
      title: d.title,
      path: d.path,
      description: d.description,
      version,
      change,
      parentId: d.parentId,
      counterpartId: d.counterpartId,
      prototypeUrl: d.prototypeUrl,
      order,
      projects: { connect: d.projectIds.map((id) => ({ id })) },
    },
  });
  await log(user.id, `added "${d.title}" to the ${version === "TODAY" ? "current" : "2028"} site map`);
  revalidatePath("/sitemap");
}

export async function updateNode(fd: FormData) {
  const user = await requireRole("EDITOR");
  const id = str(fd, "id");
  const d = readNode(fd);
  const existing = await db.siteMapNode.findUniqueOrThrow({ where: { id } });
  if (existing.version !== d.version) throw new Error("Can't move a page between site maps");
  await checkNodeLinks(d.version as MapVersion, d.change as NodeChange, d.parentId, d.counterpartId, id);
  await db.siteMapNode.update({
    where: { id },
    data: {
      title: d.title,
      path: d.path,
      description: d.description,
      change: d.change as NodeChange,
      parentId: d.parentId,
      counterpartId: d.counterpartId,
      prototypeUrl: d.prototypeUrl,
      projects: { set: d.projectIds.map((pid) => ({ id: pid })) },
    },
  });
  await log(user.id, `updated the site map page "${d.title}"`);
  revalidatePath("/sitemap");
}

export async function deleteNode(fd: FormData) {
  const user = await requireRole("EDITOR");
  const node = await db.siteMapNode.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  await db.siteMapNode.delete({ where: { id: node.id } });
  await log(user.id, `removed "${node.title}" and its sub-pages from the site map`);
  revalidatePath("/sitemap");
}

// ---------- Journeys ----------

export async function createJourney(fd: FormData) {
  const user = await requireRole("EDITOR");
  const d = z
    .object({
      title: z.string().trim().min(1).max(200),
      persona: z.string().max(200),
      version: z.enum(VERSIONS),
      figjamUrl: optionalUrl,
      counterpartId: z.string().transform((v) => v || null),
    })
    .parse({
      title: str(fd, "title"),
      persona: str(fd, "persona"),
      version: str(fd, "version"),
      figjamUrl: str(fd, "figjamUrl"),
      counterpartId: str(fd, "counterpartId"),
    });
  if (d.counterpartId && d.version !== "VISION") throw new Error("Only a 2028 journey links to a current one");
  const j = await db.journey.create({ data: { ...d, version: d.version as MapVersion } });
  await log(user.id, `created the journey "${j.title}"`);
  redirect(`/journeys/${j.id}`);
}

export async function updateJourney(fd: FormData) {
  const user = await requireRole("EDITOR");
  const id = str(fd, "id");
  const d = z
    .object({
      title: z.string().trim().min(1).max(200),
      persona: z.string().max(200),
      figjamUrl: optionalUrl,
      counterpartId: z.string().transform((v) => v || null),
      projectIds: z.array(z.string()),
    })
    .parse({
      title: str(fd, "title"),
      persona: str(fd, "persona"),
      figjamUrl: str(fd, "figjamUrl"),
      counterpartId: str(fd, "counterpartId"),
      projectIds: fd.getAll("projectIds").map(String).filter(Boolean),
    });
  const j = await db.journey.findUniqueOrThrow({ where: { id } });
  if (d.counterpartId && j.version !== "VISION") throw new Error("Only a 2028 journey links to a current one");
  const { projectIds, ...rest } = d;
  await db.journey.update({ where: { id }, data: { ...rest, projects: { set: projectIds.map((p) => ({ id: p })) } } });
  await log(user.id, `updated the journey "${d.title}"`);
  revalidatePath(`/journeys/${id}`);
}

export async function deleteJourney(fd: FormData) {
  const user = await requireRole("EDITOR");
  const j = await db.journey.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  await db.journey.delete({ where: { id: j.id } });
  await log(user.id, `deleted the journey "${j.title}"`);
  redirect("/journeys");
}

export async function saveStep(fd: FormData) {
  await requireRole("EDITOR");
  const d = z
    .object({
      id: z.string(),
      journeyId: z.string().min(1),
      title: z.string().trim().min(1).max(200),
      description: z.string().max(5000),
      painPoint: z.string().max(1000),
      nodeId: z.string().transform((v) => v || null),
    })
    .parse({
      id: str(fd, "id"),
      journeyId: str(fd, "journeyId"),
      title: str(fd, "title"),
      description: str(fd, "description"),
      painPoint: str(fd, "painPoint"),
      nodeId: str(fd, "nodeId"),
    });
  const { id, ...rest } = d;
  if (id) {
    await db.journeyStep.update({ where: { id }, data: rest });
  } else {
    const order = await db.journeyStep.count({ where: { journeyId: d.journeyId } });
    await db.journeyStep.create({ data: { ...rest, order } });
  }
  await db.journey.update({ where: { id: d.journeyId }, data: { updatedAt: new Date() } });
  revalidatePath(`/journeys/${d.journeyId}`);
}

export async function moveStep(fd: FormData) {
  await requireRole("EDITOR");
  const step = await db.journeyStep.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  const dir = str(fd, "dir") === "up" ? -1 : 1;
  const steps = await db.journeyStep.findMany({ where: { journeyId: step.journeyId }, orderBy: { order: "asc" } });
  const i = steps.findIndex((s) => s.id === step.id);
  const j = i + dir;
  if (j < 0 || j >= steps.length) return;
  [steps[i], steps[j]] = [steps[j], steps[i]];
  await db.$transaction(steps.map((s, idx) => db.journeyStep.update({ where: { id: s.id }, data: { order: idx } })));
  revalidatePath(`/journeys/${step.journeyId}`);
}

export async function deleteStep(fd: FormData) {
  await requireRole("EDITOR");
  const step = await db.journeyStep.findUniqueOrThrow({ where: { id: str(fd, "id") } });
  await db.journeyStep.delete({ where: { id: step.id } });
  revalidatePath(`/journeys/${step.journeyId}`);
}

// ---------- People ----------

export async function setUserRole(fd: FormData) {
  const admin = await requireRole("ADMIN");
  const id = str(fd, "id");
  const role = z.enum(["ADMIN", "EDITOR", "VIEWER"]).parse(str(fd, "role")) as Role;
  if (id === admin.id && role !== "ADMIN") throw new Error("You can't remove your own admin role");
  const u = await db.user.update({ where: { id }, data: { role } });
  await log(admin.id, `set ${u.name ?? u.email} as ${role.toLowerCase()}`);
  revalidatePath("/people");
}
