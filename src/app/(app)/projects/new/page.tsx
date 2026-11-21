import { redirect } from "next/navigation";
import { hasRole, requireUser } from "@/lib/auth";
import { createProject } from "@/lib/actions";
import { SubmitButton } from "@/components/client";

export default async function NewProject() {
  const me = await requireUser();
  if (!hasRole(me, "EDITOR")) redirect("/");
  return (
    <form action={createProject} className="card mx-auto max-w-xl space-y-4 p-6">
      <div>
        <h1 className="text-xl font-semibold">New project</h1>
        <p className="text-sm text-zinc-500">
          You'll get a PRD with Cagan's checklist. Fill in what you know; the hub tracks what's still missing.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="title">Name</label>
        <input id="title" name="title" required className="input" placeholder="e.g. Self-serve onboarding" />
      </div>
      <div>
        <label className="label" htmlFor="team">Team</label>
        <input id="team" name="team" className="input" placeholder="e.g. Growth" />
      </div>
      <div>
        <label className="label" htmlFor="summary">One-paragraph summary</label>
        <textarea id="summary" name="summary" rows={4} className="input" placeholder="What are we trying to do and why?" />
      </div>
      <SubmitButton>Create project</SubmitButton>
    </form>
  );
}
