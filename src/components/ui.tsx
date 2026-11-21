import type { NodeChange, SectionStatus } from "@prisma/client";
import { SECTION_STATUS_LABEL, SECTION_STATUS_STYLE } from "@/lib/status";

export function StatusBadge({ status, label }: { status: SectionStatus; label?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${SECTION_STATUS_STYLE[status]}`}>
      {label ?? SECTION_STATUS_LABEL[status]}
    </span>
  );
}

export const CHANGE_LABEL: Record<NodeChange, string> = {
  KEEP: "Stays",
  REMOVE: "Removed in 2028",
  NEW: "New",
  IMPROVED: "Improved",
  UNCHANGED: "Unchanged",
};

const CHANGE_STYLE: Record<NodeChange, string> = {
  KEEP: "bg-zinc-100 text-zinc-600 ring-zinc-300",
  REMOVE: "bg-red-50 text-red-700 ring-red-200",
  NEW: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  IMPROVED: "bg-sky-50 text-sky-800 ring-sky-200",
  UNCHANGED: "bg-zinc-100 text-zinc-600 ring-zinc-300",
};

export function ChangeBadge({ change }: { change: NodeChange }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CHANGE_STYLE[change]}`}>
      {CHANGE_LABEL[change]}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">{children}</div>;
}
