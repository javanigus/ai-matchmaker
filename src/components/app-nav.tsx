"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Real gap caught via founder feedback: every phase since Phase 0 deferred
// building any shared header/nav as "visual polish, not needed to prove
// the mechanism" — reasonable when there was one real page, not once
// there were five and the only way between them was typing a URL by
// hand. Matches prototype/*.html's own sidebar (desktop) + top bar and
// bottom tab bar (mobile) structure, trimmed to only the routes that
// actually exist in the real app — Matches and Messages joined in
// Phase 8; AI Profile Coach, Notifications, and Settings still appear
// in the prototype's nav but aren't built yet (Phase 10), so linking
// to them here would be a dead link dressed up as a real feature.
//
// Deliberately does NOT adopt the prototype's full lg:flex 3-column
// shell (sidebar + main + AI panel side by side, each reserving real
// layout space) — the persistent AiMatchmakerPanel (Phase 6) is already
// built as a fixed-position overlay specifically because no such shell
// existed yet, and restructuring that positioning model is a separate
// concern from "there's no way to navigate between pages," which is
// the actual problem being fixed here. Onboarding and Signup
// deliberately don't get this nav — technical-plan.md's own UX
// walkthrough specifies onboarding as "a single full-width chat — no
// sidebar," and Signup is pre-authentication.
const NAV_ITEMS = [
  {
    href: "/search",
    label: "Search",
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path strokeLinecap="round" d="M20 20l-4.5-4.5" />
      </>
    ),
  },
  {
    href: "/recommendations",
    label: "AI Recommendations",
    icon: <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" fill="currentColor" stroke="none" />,
  },
  {
    href: "/saved-profiles",
    label: "Saved Profiles",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v16l-6-4-6 4V4z" />,
  },
  {
    href: "/matches",
    label: "Matches",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20s-7-4.35-9.5-8.5C1 8 2.5 5 6 5c2 0 3.5 1.2 4 2.5.5-1.3 2-2.5 4-2.5 3.5 0 5 3 3.5 6.5C19 15.65 12 20 12 20z"
      />
    ),
  },
  {
    href: "/messages",
    label: "Messages",
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z" />,
  },
  {
    href: "/profile",
    label: "My Profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20c1.5-4 5-5.5 7.5-5.5s6 1.5 7.5 5.5" />
      </>
    ),
  },
  {
    href: "/ai-memory",
    label: "AI Memory",
    // Matches the prototype's own mobile bottom bar exactly — it never
    // included AI Memory there either (6 icons, sidebar-only for this
    // one), presumably for space; now genuinely needed once Matches +
    // Messages brought the desktop sidebar to 7 items.
    mobileNav: false,
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3.5 3.5" />
      </>
    ),
  },
];

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 shrink-0">
      {children}
    </svg>
  );
}

export default function AppNav({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentLabel = NAV_ITEMS.find((item) => pathname?.startsWith(item.href))?.label ?? "AI Matchmaker";

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/signup");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
          </svg>
        </div>
        <span className="font-semibold text-stone-800">{currentLabel}</span>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 shrink-0 bg-white border-r border-stone-200 min-h-screen sticky top-0 self-start">
        <div className="px-5 py-5 flex items-center gap-2 border-b border-stone-100">
          <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9L12 2.5z" />
            </svg>
          </div>
          <span className="font-serif text-base text-stone-900">AI Matchmaker</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  active ? "bg-accent-50 text-accent-700" : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <NavIcon>{item.icon}</NavIcon>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-stone-100">
          {userName && <p className="text-sm font-medium text-stone-800 mb-2 truncate">{userName}</p>}
          <button type="button" onClick={signOut} className="text-xs text-stone-400 hover:text-stone-600">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 h-16 flex items-center justify-around px-1">
        {NAV_ITEMS.filter((item) => item.mobileNav !== false).map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 ${active ? "text-accent-700" : "text-stone-400"}`}>
              <NavIcon>{item.icon}</NavIcon>
              <span className="text-[10px] font-medium">{item.label === "AI Recommendations" ? "For You" : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
