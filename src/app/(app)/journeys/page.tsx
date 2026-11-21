import Link from "next/link";
import { db } from "@/lib/db";
import { hasRole, requireUser } from "@/lib/auth";
import { Empty, timeAgo } from "@/components/ui";

export default async function JourneysPage() {
  const me = await requireUser();
  const journeys = await db.journey.findMany({
    include: { counterpart: true, successors: true, _count: { select: { steps: true, comments: { where: { resolved: false } } } } },
    orderBy: { updatedAt: "desc" },
  });
  const vision = journeys.filter((j) => j.version === "VISION");
  const todayOnly = journeys.filter((j) => j.version === "TODAY" && j.successors.length === 0);
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Journeys</h1>
          <p className="text-sm text-zinc-500">Each 2028 journey shows next to the journey it replaces today, when there is one.</p>
        </div>
        {hasRole(me, "EDITOR") && <Link href="/journeys/new" className="btn">New journey</Link>}
      </div>
      {journeys.length === 0 && <Empty>No journeys yet. Recreate the ones in FigJam here, or link the board.</Empty>}
      {vision.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">2028 journeys</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {vision.map((j) => (
              <Link key={j.id} href={`/journeys/${j.id}`} className="card block p-4 hover:border-indigo-300">
                <h3 className="font-medium">{j.title}</h3>
                <p className="text-xs text-zinc-500">
                  {j.persona && `${j.persona} · `}
                  {j._count.steps} steps · {j.counterpart ? `replaces "${j.counterpart.title}"` : "new journey"} · updated {timeAgo(j.updatedAt)}
                  {j._count.comments > 0 && ` · ${j._count.comments} open comments`}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {todayOnly.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Today's journeys without a 2028 version</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {todayOnly.map((j) => (
              <Link key={j.id} href={`/journeys/${j.id}`} className="card block p-4 hover:border-indigo-300">
                <h3 className="font-medium">{j.title}</h3>
                <p className="text-xs text-zinc-500">{j.persona && `${j.persona} · `}{j._count.steps} steps</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
