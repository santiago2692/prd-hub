import { CAGAN_SECTIONS, GROUPS, type SectionGroup } from "@/lib/cagan";
import { SECTION_STATUS_LABEL } from "@/lib/status";
import { StatusBadge } from "@/components/ui";
import type { SectionStatus } from "@prisma/client";

const STATUS_HELP: Record<SectionStatus, string> = {
  MISSING: "Nothing written yet.",
  DRAFT: "Written, not yet checked.",
  NEEDS_INFO: "Questions are open; we need input from someone.",
  NEEDS_DATA: "The claim needs numbers behind it (analytics, research, sizing).",
  NEEDS_VALIDATION: "We believe it, but haven't tested it with customers or the team.",
  READY: "Answered with evidence and agreed.",
};

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">How to write a PRD here</h1>
        <p className="text-sm text-zinc-600">
          Every project uses the same checklist, based on Marty Cagan's opportunity assessment and product spec guidance in <em>Inspired</em>.
          Fill it in as you learn. The project's status is worked out from the checklist, so the whole team can see what's still needed.
        </p>
      </div>
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Statuses</h2>
        <ul className="space-y-2 text-sm">
          {(Object.keys(STATUS_HELP) as SectionStatus[]).map((s) => (
            <li key={s} className="flex items-center gap-3">
              <span className="w-36"><StatusBadge status={s} label={SECTION_STATUS_LABEL[s]} /></span>
              <span className="text-zinc-600">{STATUS_HELP[s]}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-zinc-500">
          A project shows its worst open status: anything missing or needing info first, then data, then validation.
        </p>
      </section>
      {(Object.keys(GROUPS) as SectionGroup[]).map((g) => (
        <section key={g} className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{GROUPS[g].title}</h2>
            <p className="text-sm text-zinc-500">{GROUPS[g].blurb}</p>
          </div>
          {CAGAN_SECTIONS.filter((c) => c.group === g).map((c) => (
            <div key={c.key} className="card p-4 text-sm">
              <h3 className="font-medium">{c.title}</h3>
              <p className="text-zinc-500">{c.question}</p>
              <ul className="mt-2 list-disc pl-5 text-zinc-700">
                {c.guidance.map((x) => <li key={x}>{x}</li>)}
              </ul>
              <p className="mt-2 text-xs text-zinc-500">Typical evidence: {c.evidence}</p>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
