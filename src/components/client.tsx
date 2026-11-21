"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signOut } from "next-auth/react";

export function SubmitButton({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Saving…" : children}
    </button>
  );
}

/** Keeps the page live: refreshes server data every few seconds unless someone is typing. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const el = document.activeElement;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (document.querySelector("details[data-editing][open]")) return;
      router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function SignOutButton() {
  return (
    <button className="text-sm text-zinc-500 hover:text-zinc-900" onClick={() => signOut({ callbackUrl: "/login" })}>
      Sign out
    </button>
  );
}

export function GoogleSignIn() {
  return (
    <button className="btn w-full" onClick={() => signIn("google", { callbackUrl: "/" })}>
      Sign in with Google
    </button>
  );
}

export function DevSignIn() {
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        const email = new FormData(e.currentTarget).get("email");
        signIn("dev", { email, callbackUrl: "/" });
      }}
    >
      <input name="email" type="email" required placeholder="you@company.com" className="input" />
      <button className="btn-ghost w-full">Dev sign-in (local only)</button>
    </form>
  );
}

export function ConfirmButton({ children, message, className = "btn-danger" }: { children: React.ReactNode; message: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
