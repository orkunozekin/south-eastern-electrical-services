"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { getClientAuth } from "@/lib/firebase/client";

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const credential = await signInWithEmailAndPassword(
        getClientAuth(),
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Sign-in failed.");
      }

      router.replace(nextPath.startsWith("/admin") ? nextPath : "/admin");
      router.refresh();
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError("Invalid email or password.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not sign in.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-5">
      <label className="block">
        <span className="text-mist/80 text-sm font-medium">Email</span>
        <input
          required
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-navy-deep/50 focus:border-amber mt-2 w-full border border-white/20 px-4 py-3 text-white transition outline-none"
        />
      </label>
      <label className="block">
        <span className="text-mist/80 text-sm font-medium">Password</span>
        <input
          required
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-navy-deep/50 focus:border-amber mt-2 w-full border border-white/20 px-4 py-3 text-white transition outline-none"
        />
      </label>

      {error && <p className="text-amber text-sm">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-amber text-navy-deep hover:bg-amber-hot w-full px-6 py-3 text-base font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
