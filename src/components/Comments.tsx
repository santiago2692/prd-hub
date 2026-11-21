import type { Comment, User } from "@prisma/client";
import { addComment, toggleCommentResolved } from "@/lib/actions";
import { SubmitButton } from "./client";
import { timeAgo } from "./ui";

type Target = { projectId?: string; sectionKey?: string; siteMapNodeId?: string; journeyId?: string };

export function Comments({
  comments,
  target,
  returnTo,
  me,
  compact = false,
}: {
  comments: (Comment & { author: User })[];
  target: Target;
  returnTo: string;
  me: User;
  compact?: boolean;
}) {
  const open = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);
  return (
    <div className="space-y-3">
      {open.map((c) => (
        <CommentRow key={c.id} c={c} me={me} returnTo={returnTo} />
      ))}
      {resolved.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-zinc-500">{resolved.length} resolved</summary>
          <div className="mt-2 space-y-2 opacity-70">
            {resolved.map((c) => (
              <CommentRow key={c.id} c={c} me={me} returnTo={returnTo} />
            ))}
          </div>
        </details>
      )}
      <form action={addComment} className="flex gap-2">
        {Object.entries(target).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="returnTo" value={returnTo} />
        <textarea name="body" required rows={compact ? 1 : 2} placeholder="Add a comment or question…" className="input" />
        <SubmitButton className="btn-ghost self-start">Comment</SubmitButton>
      </form>
    </div>
  );
}

function CommentRow({ c, me, returnTo }: { c: Comment & { author: User }; me: User; returnTo: string }) {
  const canResolve = me.role !== "VIEWER" || c.authorId === me.id;
  return (
    <div className="rounded-md bg-zinc-50 p-3 text-sm">
      <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">{c.author.name ?? c.author.email}</span>
        <span>{timeAgo(c.createdAt)}</span>
        {canResolve && (
          <form action={toggleCommentResolved} className="ml-auto">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="returnTo" value={returnTo} />
            <button className="text-indigo-600 hover:underline">{c.resolved ? "Reopen" : "Resolve"}</button>
          </form>
        )}
      </div>
      <p className="whitespace-pre-wrap">{c.body}</p>
    </div>
  );
}
