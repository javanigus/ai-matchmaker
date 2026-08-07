import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Real marketing landing page, adapted from prototype/index.html —
// this was still the create-next-app boilerplate until now, the last
// page in the app that hadn't been replaced with something real.
// Trimmed from the mockup: the header/footer nav to Pricing, About,
// Contact, Privacy Policy, and Terms of Service all link to pages that
// don't exist in the real app (out of scope for any phase so far) —
// linking to them would be dead links dressed up as real features,
// same reasoning already applied to AppNav. "Log In" (-> /login) *is*
// kept, unlike those — real gap caught right after adding Sign Out to
// AppNav: there was nowhere for a signed-out user to actually get back
// in, since /signup's signUp() call doesn't sign an existing user in.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/search");
  }

  return (
    <div className="bg-stone-50 text-stone-800 min-h-screen">
      <header className="max-w-5xl mx-auto px-6 pt-8 pb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
            </svg>
          </div>
          <span className="font-serif text-lg text-stone-900">AI Matchmaker</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-500">
          <Link href="/search" className="hover:text-stone-800">
            Browse profiles
          </Link>
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900">
            Log In
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-accent-600 text-white px-4 py-2 rounded-full hover:bg-accent-700 transition">
            Sign Up
          </Link>
        </div>
      </header>

      <section className="bg-gradient-to-b from-accent-50 to-stone-50">
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="font-serif text-4xl sm:text-5xl text-stone-900 leading-tight">Meet your personal AI Matchmaker.</h1>
            <p className="mt-5 text-lg text-stone-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              It gets to know you through conversation, learns what truly matters to you, and continuously improves your
              matches over time.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto bg-accent-600 text-white font-medium px-7 py-3.5 rounded-full hover:bg-accent-700 transition text-center"
              >
                Meet your AI Matchmaker
              </Link>
              <Link href="/search" className="text-sm font-medium text-stone-600 hover:text-stone-900">
                Or browse profiles first →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-xl p-4 sm:p-5 max-w-sm mx-auto lg:mx-0 lg:ml-auto">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-stone-100">
                <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-stone-800">Your AI Matchmaker</span>
              </div>
              <div className="space-y-2.5">
                <div className="mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed">
                  Tell me about the kind of relationship you&apos;re hoping to build.
                </div>
                <div className="ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed">
                  Something long-term — I want a real partnership, not just someone to pass time with.
                </div>
                <div className="mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed">
                  That&apos;s clear. What does a fulfilling Saturday look like for you?
                </div>
                <div className="ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-relaxed">
                  Hiking in the morning, then cooking a big dinner with someone I love.
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2">
                <div className="flex-1 h-8 rounded-full bg-stone-50 border border-stone-200" />
                <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-accent-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l16-7-6.5 16-3-6.5L4 12z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-stone-200">
        <div className="max-w-4xl mx-auto px-6 py-14 grid sm:grid-cols-3 gap-10">
          <div className="text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center mx-auto sm:mx-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z" />
              </svg>
            </div>
            <p className="mt-3 font-medium text-stone-900">Talk, don&apos;t fill out forms</p>
            <p className="mt-1 text-sm text-stone-500 leading-relaxed">A real conversation builds your profile for you — no long forms.</p>
          </div>
          <div className="text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center mx-auto sm:mx-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-7 4 14 2-7h6" />
              </svg>
            </div>
            <p className="mt-3 font-medium text-stone-900">One evolving understanding of you</p>
            <p className="mt-1 text-sm text-stone-500 leading-relaxed">
              Grows through conversation and your feedback over time — all visible in My Profile.
            </p>
          </div>
          <div className="text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center mx-auto sm:mx-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 4.5-5.5" />
              </svg>
            </div>
            <p className="mt-3 font-medium text-stone-900">Honest, not fake-precise</p>
            <p className="mt-1 text-sm text-stone-500 leading-relaxed">Confidence levels you can trust, not made-up percentages.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
