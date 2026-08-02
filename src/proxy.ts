import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts and middleware() -> proxy() —
// a leftover middleware.ts is silently ignored at build time with no error,
// so this rename matters. See: https://nextjs.org/docs/messages/middleware-to-proxy
//
// Scoped to session refresh only for now. The real routing rule from
// docs/PLAN.md ("Routing before baseline is reached" / "Before onboarding is
// complete" in docs/prd.md — redirect profile-dependent pages to onboarding
// when baseline_reached_at is null, Search stays open regardless) belongs
// here too, once those pages exist for real (Phase 1+) — not added yet
// since there's nothing real to redirect to or from.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refreshes the auth token if expired — required for Server Components,
  // which can read cookies but can't write them.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
