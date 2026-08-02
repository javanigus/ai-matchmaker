// Stub only — the real onboarding conversation is Phase 2 (docs/PLAN.md).
// This exists so Phase 1's routing rule (redirect profile-dependent pages
// here when baseline_reached_at is null) has something real to redirect to.
export default function OnboardingPage() {
  return (
    <main className="max-w-md mx-auto px-6 py-16 text-center">
      <h1 className="font-serif text-2xl text-stone-900 mb-2">Onboarding</h1>
      <p className="text-sm text-stone-600">
        The real AI Matchmaker conversation is built in Phase 2. You&apos;re seeing
        this page because the routing rule from Phase 1 correctly redirected you
        here — there&apos;s nothing to complete yet.
      </p>
    </main>
  );
}
