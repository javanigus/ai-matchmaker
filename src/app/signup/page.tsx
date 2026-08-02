"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Phase 0 scope: prove the real signup mechanism works end to end
// (matches prd.md's Name/Email/Password fields from prototype/signup.html).
// Visual polish to fully match the mockup, and Google OAuth (also in the
// mockup), are deferred — not needed to prove the underlying auth flow.
export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <main className="max-w-sm mx-auto px-6 py-16 text-center">
        <h1 className="font-serif text-2xl text-stone-900 mb-2">Check your email</h1>
        <p className="text-sm text-stone-600">
          We sent a confirmation link to {email}.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <h1 className="font-serif text-2xl text-stone-900 mb-6">Create your account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Ellis"
            className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full text-sm border border-stone-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full bg-accent-600 text-white font-medium rounded-full py-2.5 hover:bg-accent-700 transition disabled:opacity-50"
        >
          {status === "loading" ? "Creating account…" : "Create Account"}
        </button>
      </form>
    </main>
  );
}
