"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg space-y-3 p-6">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="text-sm text-zinc-600">{error.message || "That action couldn't be completed."}</p>
      <button className="btn-ghost" onClick={reset}>
        Go back
      </button>
    </div>
  );
}
