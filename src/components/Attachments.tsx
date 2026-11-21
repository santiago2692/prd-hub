import type { Attachment, User } from "@prisma/client";
import { addLink, deleteAttachment, uploadFiles } from "@/lib/actions";
import { sectionTitle } from "@/lib/status";
import { ConfirmButton, SubmitButton } from "./client";

export function fileHref(a: Attachment) {
  return a.kind === "LINK" ? a.url! : `/api/files/${a.id}`;
}

export function isImage(a: Attachment) {
  return a.kind === "FILE" && /^image\/(png|jpe?g|gif|webp|avif)$/.test(a.mimeType ?? "");
}

function size(n: number | null) {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;
}

const CONTEXT_LABEL = { GENERAL: "Evidence", TODAY: "Today", VISION: "2028" } as const;

export function AttachmentList({
  items,
  canEdit,
  showSection = false,
}: {
  items: (Attachment & { uploadedBy: User })[];
  canEdit: boolean;
  showSection?: boolean;
}) {
  if (!items.length) return null;
  return (
    <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200 text-sm">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 p-2">
          {isImage(a) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileHref(a)} alt="" className="h-10 w-14 rounded object-cover ring-1 ring-zinc-200" />
          ) : (
            <span className="flex h-10 w-14 items-center justify-center rounded bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-500">
              {a.kind === "LINK" ? "Link" : (a.name.split(".").pop() ?? "file").slice(0, 4)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <a href={fileHref(a)} target="_blank" rel="noreferrer noopener" className="link block truncate">
              {a.name}
            </a>
            <p className="text-xs text-zinc-500">
              {CONTEXT_LABEL[a.context]}
              {showSection && a.sectionKey && ` · ${sectionTitle(a.sectionKey)}`}
              {a.size ? ` · ${size(a.size)}` : ""} · {a.uploadedBy.name ?? a.uploadedBy.email}
            </p>
          </div>
          {canEdit && (
            <form action={deleteAttachment}>
              <input type="hidden" name="id" value={a.id} />
              <ConfirmButton message={`Remove "${a.name}"?`}>Remove</ConfirmButton>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

export function AddAttachment({ projectId, sectionKey, defaultContext = "GENERAL" }: { projectId: string; sectionKey?: string; defaultContext?: "GENERAL" | "TODAY" | "VISION" }) {
  const contextSelect = (
    <select name="context" defaultValue={defaultContext} className="input w-auto" aria-label="Where this belongs">
      <option value="GENERAL">Evidence</option>
      <option value="TODAY">Today (current state)</option>
      <option value="VISION">2028 vision</option>
    </select>
  );
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <form action={uploadFiles} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-zinc-300 p-2">
        <input type="hidden" name="projectId" value={projectId} />
        {sectionKey && <input type="hidden" name="sectionKey" value={sectionKey} />}
        <input
          type="file"
          name="files"
          multiple
          required
          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.md"
          className="min-w-0 flex-1 text-xs"
        />
        {contextSelect}
        <SubmitButton className="btn-ghost">Upload</SubmitButton>
      </form>
      <form action={addLink} className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-zinc-300 p-2">
        <input type="hidden" name="projectId" value={projectId} />
        {sectionKey && <input type="hidden" name="sectionKey" value={sectionKey} />}
        <input name="url" type="url" required placeholder="Google Doc, FigJam, dashboard link…" className="input min-w-0 flex-1" />
        <input name="name" placeholder="Label (optional)" className="input w-36" />
        {contextSelect}
        <SubmitButton className="btn-ghost">Add link</SubmitButton>
      </form>
    </div>
  );
}
