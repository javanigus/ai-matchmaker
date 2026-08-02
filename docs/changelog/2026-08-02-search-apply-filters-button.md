# 2026-08-02 — Search: Apply Filters button; dropped redundant Gender "Everyone" option

## What changed

**`prototype/search.html`:**
- Added an **Apply Filters** button at the end of the filter bar.
- Removed the **Everyone** option from the Gender filter — every other filter already treats its unselected default (Age range, Religion, Children, Distance, Education, Relationship goals) as "no filter applied," so Gender having a second, explicit way to say the same thing was inconsistent with the rest of the bar, not a distinct choice.

**`prototype/assets/app.js`:** wired the button to show a "Filters applied." toast.

## Why it changed

Founder feedback: with six filters, applying each one immediately on change would make the results grid re-render after every single dropdown change — twitchy rather than letting someone set up several criteria before committing. An explicit Apply Filters button groups those changes into one deliberate action instead. The Gender fix was a smaller catch made while touching the same filter bar.
