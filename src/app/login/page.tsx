import { redirect } from "next/navigation";
import { devLoginEnabled, getCurrentUser, googleEnabled } from "@/lib/auth";
import { DevSignIn, GoogleSignIn } from "@/components/client";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-xl font-semibold">PRD Hub</h1>
          <p className="text-sm text-zinc-500">Where we plan, review and track what we build next.</p>
        </div>
        {error && (
          <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">
            {error === "AccessDenied" ? "That account isn't allowed. Use your company Google account." : "Sign-in failed. Try again."}
          </p>
        )}
        {googleEnabled && <GoogleSignIn />}
        {devLoginEnabled && <DevSignIn />}
        {!googleEnabled && !devLoginEnabled && (
          <p className="text-sm text-amber-700">No sign-in method is configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.</p>
        )}
      </div>
    </main>
  );
}
