# 2026-08-01 — AI Memory as a summarized timeline, evidence-based confidence, simplified My Profile

## What changed

**`docs/prd.md`:**

- **Compatibility Graph**: confidence is now documented as shown only as High, Medium, or Low — never a percentage. Added "How confidence is determined": confidence depends on evidence quality (explicitness, certainty of language, direct statement vs. inference, consistency across conversations, user corrections and approvals, recency, photo vs. conversation evidence), not on how many times something was mentioned. A single clear "I definitely want children" produces High confidence immediately; several vague "maybe someday" comments still only produce Medium.
- **AI Memory**: reframed from an audit-log of quotes to a timeline of summarized learning events — "how your AI Matchmaker has gotten to know you," not "every sentence you've ever said." Each entry is one plain-language summary plus which categories it updated and an optional Confirmed / AI inferred status — no confidence deltas or percentages. Added the internal data flow that produces each entry: Conversation → AI generates one structured session summary → AI proposes Compatibility Graph updates → user approves/edits/rejects → Compatibility Graph updated → one summarized AI Memory event recorded, forming the permanent audit trail.
- **AI Profile Coach**: now explicitly framed as improving profile quality, Compatibility Graph completeness, and match quality; example suggestion list updated to drop the "confidence is only 48%" phrasing in favor of "confidence is still Medium," matching the no-percentages rule.
- **How the AI-Facing Pages Fit Together**: reordered and reworded the four bullets so Compatibility Graph answers "what does my AI Matchmaker currently believe about me?" and AI Memory answers "how did the AI learn this?" (previously "why").

**`prototype/`:**

- Removed the "More" section (Settings, AI Memory, Notifications, Subscription & Billing, About & Support links) from the bottom of My Profile — all of these already live in the main sidebar nav, so the section was pure duplication. My Profile now ends after the public Profile Text section.
- Rebuilt all five `ai-memory.html` timeline cards as summarized learning events: a plain-language paragraph per event, an "Updated" list of the categories it touched, and an optional "Status" of Confirmed or AI inferred. Removed every raw quote and every "Confidence +X%" tag. Softened the page intro and the AI panel's opening message to match the new framing.
- Removed the remaining raw confidence percentages from My Profile's Lifestyle category card and AI Profile Coach's Lifestyle suggestion — both now read "Confidence: Medium" / "Lifestyle confidence is still Medium" instead of "(48%)".

## Why it changed

Founder decision: AI Memory was reading like a quote database and a confidence-percentage scoreboard, which implies far more precision than a "definitely vs. maybe" evidence model can honestly support, and isn't how a human matchmaker would describe remembering a conversation. The product should feel like "my AI remembers the important things we've talked about," not "it stores every sentence I've ever said" — this is a simpler mental model for users and a smaller surface for the eventual backend to have to get right. The My Profile "More" section was leftover duplication from before AI Profile Coach and other pages had their own sidebar entries.
