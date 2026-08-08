import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renamed middleware.ts -> proxy.ts and middleware() -> proxy() —
// a leftover middleware.ts is silently ignored at build time with no error,
// so this rename matters. See: https://nextjs.org/docs/messages/middleware-to-proxy
//
// Routing rule from docs/PLAN.md ("Routing before baseline is reached") /
// docs/prd.md ("Before onboarding is complete"): pages that depend on a
// profile existing redirect to onboarding until baseline_reached_at is set.
// Search (Phase 5) is the deliberate exception and stays open regardless
// of baseline — not listed in GATED_PATHS. It still requires being
// signed in, same as every other real page, but that's a separate check
// done in src/app/search/page.tsx itself, not this baseline-specific gate.
const GATED_PATHS = ["/profile", "/ai-memory", "/recommendations", "/saved-profiles", "/matches", "/messages", "/compatibility", "/settings"];

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGated = GATED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));
  if (isGated) {
    if (!user) {
      return NextResponse.redirect(new URL("/signup", request.url));
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("baseline_reached_at")
      .eq("id", user.id)
      .single();

    if (!userRow?.baseline_reached_at) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
