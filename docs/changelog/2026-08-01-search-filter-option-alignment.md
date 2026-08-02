# 2026-08-01 — Search filter options aligned with the actual profile enums

## What changed

**`prototype/search.html`:** fixed four of the six Search filter dropdowns, which had never actually been updated when the quick-fact/Required-field enums were defined — they'd drifted into their own, slightly different option sets:
- **Gender** — added the missing **Non-binary** option (present on both the Basics and Dealbreakers Gender fields, absent here).
- **Religion** — reordered to match the Religious affiliation quick-fact list (same 7 values already, just a different order — no functional bug, just tidied for consistency).
- **Children** — added the missing **Undecided on children** option (present in the Wants children quick-fact enum, absent here).
- **Education** — relabeled `Bachelor's` / `Master's` to **Bachelor's degree** / **Master's degree**, matching the Education level quick-fact enum exactly. The abbreviated wording wasn't just cosmetic — an exact-match filter comparing against `Bachelor's degree` would never have matched a search for `Bachelor's`.
- **Relationship goals** — replaced the non-existent `Open to short-term` option with **Casual**, and added the missing **Long-term, open to marriage** option, matching the Relationship goals quick-fact enum exactly.

Age range and Distance were left as-is — both filter a numeric/computed value (Age, Location) via bucketed ranges, not a closed list that needs to match a profile field verbatim.

## Why it changed

Founder question: do Search's filter options actually match the profile-side enums now? They didn't — the quick-fact and Required-field work defined the canonical option lists but never propagated them into Search's markup, leaving the same "filter value that doesn't exist on any profile" bug the Ethnicity and quick-fact fixes were meant to close, just still present here.
