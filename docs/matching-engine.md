# Matching Engine

> Status: Active — Version 1 (partial)
> Last updated: 2026-07-31

## Purpose

The matching engine finds compatible long-term partners for a user by reasoning over the [Compatibility Graph](compatibility-graph.md) rather than over profile fields alone.

## Inputs

Compatibility Graph entries: facts, preferences, inferred values, confidence scores, and supporting evidence.

## Algorithm Overview

Matching is based on the Compatibility Graph rather than only profile fields. Users receive compatibility explanations rather than only a compatibility score.

_Pending: the specific scoring/ranking methodology has not yet been decided._

## Open Questions

- What is the scoring or ranking methodology?
- How do confidence scores factor into a match?
- How are compatibility explanations generated from the graph?
