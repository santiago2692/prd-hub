import type { SectionStatus, Stage } from "@prisma/client";
import { CAGAN_SECTIONS, SECTION_BY_KEY } from "./cagan";

export const SECTION_STATUS_LABEL: Record<SectionStatus, string> = {
  MISSING: "Missing",
  DRAFT: "Draft",
  NEEDS_INFO: "Needs more info",
  NEEDS_DATA: "Needs data",
  NEEDS_VALIDATION: "Needs validation",
  READY: "Ready",
};

export const SECTION_STATUS_STYLE: Record<SectionStatus, string> = {
  MISSING: "bg-zinc-100 text-zinc-600 ring-zinc-300",
  DRAFT: "bg-sky-50 text-sky-700 ring-sky-200",
  NEEDS_INFO: "bg-amber-50 text-amber-800 ring-amber-200",
  NEEDS_DATA: "bg-orange-50 text-orange-800 ring-orange-200",
  NEEDS_VALIDATION: "bg-violet-50 text-violet-800 ring-violet-200",
  READY: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

export const STAGE_LABEL: Record<Stage, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  IN_BUILD: "In build",
  SHIPPED: "Shipped",
  PARKED: "Parked",
};

export type Readiness = {
  label: string;
  tone: SectionStatus;
  percent: number;
  ready: number;
  total: number;
  gaps: { key: string; title: string; status: SectionStatus; note: string }[];
};

/** The project's overall state, computed from its checklist. The worst open status wins. */
export function computeReadiness(
  sections: { key: string; status: SectionStatus; note: string }[],
): Readiness {
  const byKey = new Map(sections.map((s) => [s.key, s]));
  const all = CAGAN_SECTIONS.map((c) => {
    const s = byKey.get(c.key);
    return { key: c.key, title: c.title, status: s?.status ?? "MISSING", note: s?.note ?? "" };
  });
  const ready = all.filter((s) => s.status === "READY").length;
  const gaps = all.filter((s) => s.status !== "READY");
  const count = (st: SectionStatus) => gaps.filter((g) => g.status === st).length;

  let label = "Ready for review";
  let tone: SectionStatus = "READY";
  if (count("MISSING") + count("NEEDS_INFO") > 0) {
    label = "Needs more info";
    tone = "NEEDS_INFO";
  } else if (count("NEEDS_DATA") > 0) {
    label = "Needs data";
    tone = "NEEDS_DATA";
  } else if (count("NEEDS_VALIDATION") > 0) {
    label = "Needs validation";
    tone = "NEEDS_VALIDATION";
  } else if (count("DRAFT") > 0) {
    label = "Drafting";
    tone = "DRAFT";
  }
  return {
    label,
    tone,
    percent: Math.round((ready / CAGAN_SECTIONS.length) * 100),
    ready,
    total: CAGAN_SECTIONS.length,
    gaps,
  };
}

export function sectionTitle(key: string | null | undefined) {
  return key ? (SECTION_BY_KEY[key]?.title ?? key) : "";
}
