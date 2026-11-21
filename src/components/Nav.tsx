import Link from "next/link";
import type { User } from "@prisma/client";
import { SignOutButton } from "./client";

export function Nav({ user }: { user: User }) {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          PRD Hub
        </Link>
        <nav className="flex flex-wrap gap-4 text-sm text-zinc-600">
          <Link href="/" className="hover:text-zinc-900">Projects</Link>
          <Link href="/sitemap" className="hover:text-zinc-900">Site map</Link>
          <Link href="/journeys" className="hover:text-zinc-900">Journeys</Link>
          <Link href="/guide" className="hover:text-zinc-900">PRD guide</Link>
          {user.role === "ADMIN" && <Link href="/people" className="hover:text-zinc-900">People</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-zinc-500">
            {user.name ?? user.email} · <span className="capitalize">{user.role.toLowerCase()}</span>
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
