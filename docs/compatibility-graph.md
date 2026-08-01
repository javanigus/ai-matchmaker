# Compatibility Graph

> Status: Active — Version 1
> Last updated: 2026-07-31

## Purpose

The Compatibility Graph is the source of truth for what the [AI Matchmaker](ai-matchmaker.md) understands about a user. The public profile is only one view of the graph — the graph itself is the authoritative record.

## Data Model

Each entry in the graph carries:

- **Facts** — things known about the user.
- **Preferences** — what the user wants or values.
- **Inferred values** — conclusions the AI has drawn rather than things the user stated directly.
- **Confidence scores** — how certain the AI is about a given fact, preference, or inference.
- **Supporting evidence** — what the belief is based on.
- **Timestamps** — when the belief was created or last updated.
- **User confirmation** — whether the user has confirmed the belief.

The graph continuously evolves as the user has more conversations with their AI Matchmaker.

## Signals

The graph is built and updated from the onboarding interview and from ongoing conversations with the AI Matchmaker. Whenever the AI believes the graph should change, it asks the user for confirmation before applying the change. After every conversation, the AI summarizes new beliefs, updated beliefs, and unchanged beliefs.

## Open Questions

- What is the exact schema for nodes/entries and their relationships?
- How are confidence scores calculated and updated over time?
- How is history/versioning of graph changes represented?
