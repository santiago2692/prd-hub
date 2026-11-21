import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setUserRole } from "@/lib/actions";
import { SubmitButton } from "@/components/client";

export default async function PeoplePage() {
  const me = await requireUser();
  if (me.role !== "ADMIN") redirect("/");
  const users = await db.user.findMany({ orderBy: [{ role: "asc" }, { email: "asc" }] });
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="text-sm text-zinc-500">
          Anyone at the company can sign in and comment. Make builders editors so they can create and change projects, site maps and journeys.
        </p>
      </div>
      <ul className="card divide-y divide-zinc-100 text-sm">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{u.name ?? u.email}</p>
              <p className="text-xs text-zinc-500">{u.email}</p>
            </div>
            <form action={setUserRole} className="flex items-center gap-2">
              <input type="hidden" name="id" value={u.id} />
              <select name="role" defaultValue={u.role} className="input w-auto" disabled={u.id === me.id}>
                <option value="VIEWER">Viewer (read + comment)</option>
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </select>
              {u.id !== me.id && <SubmitButton className="btn-ghost">Save</SubmitButton>}
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
