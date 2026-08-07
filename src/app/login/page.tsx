"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Real gap caught via founder testing: /signup was the only auth entry
// point in the whole app (Phase 0), and Phase 6/7's own follow-up work
// just added a real Sign Out button with nowhere for a signed-out user
// to actually log back in — signUp() with an already-registered email
// doesn't sign you in, it errors. This page is the missing other half.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    router.push("/search");
    router.refresh();
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-serif text-2xl text-stone-900 mb-6">Log in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-accent-600 text-white font-medium rounded-full py-2.5 hover:bg-accent-700 transition disabled:opacity-50"
        >
          {status === "loading" ? "Logging in…" : "Log In"}
        </button>
      </form>
      <p className="text-sm text-stone-500 mt-5 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-accent-700 font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </main>
  );
}
