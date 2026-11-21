import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { createJourney } from "@/lib/actions";
import { SubmitButton } from "@/components/client";

export default async function NewJourney() {
  const me = await requireUser();
  if (!hasRole(me, "EDITOR")) redirect("/journeys");
  const today = await db.journey.findMany({ where: { version: "TODAY" }, orderBy: { title: "asc" } });
  return (
    <form action={createJourney} className="card mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">New journey</h1>
      <div>
        <label className="label">Name</label>
        <input name="title" required className="input" placeholder="e.g. First purchase" />
      </div>
      <div>
        <label className="label">Persona</label>
        <input name="persona" className="input" placeholder="e.g. New small-business customer" />
      </div>
      <div>
        <label className="label">Version</label>
        <select name="version" className="input" defaultValue="VISION">
          <option value="TODAY">Today (how it works now)</option>
          <option value="VISION">2028 vision</option>
        </select>
      </div>
      <div>
        <label className="label">Replaces today's journey (2028 only)</label>
        <select name="counterpartId" className="input" defaultValue="">
          <option value="">None, this is new</option>
          {today.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
      </div>
      <div>
        <label className="label">FigJam link</label>
        <input name="figjamUrl" type="url" className="input" placeholder="https://www.figma.com/board/…" />
      </div>
      <SubmitButton>Create journey</SubmitButton>
    </form>
  );
}
