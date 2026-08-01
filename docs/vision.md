# Vision

> Status: Active — changes rarely
> Last updated: 2026-07-31

Long-term vision, philosophy, mission, and guiding principles. Accepted product requirements (MVP, features, monetization, roadmap) live in [prd.md](prd.md); unaccepted ideas live in [ideas.md](ideas.md).

## Mission

We help people discover and express who they really are, and use that understanding to find compatible long-term partners — replacing static profile forms with an ongoing, AI-guided conversation.

## Problem Statement

Traditional dating apps ask users to describe themselves through static profiles: a fixed set of prompts, photos, and checkboxes. This format is shallow by construction — it captures what a person is willing and able to type into a form, not who they actually are. Matching built on top of these profiles inherits that shallowness.

## Target Users

_Pending: awaiting decisions on the primary and secondary user segments._

## Long-Term Vision

Every user has a persistent AI Matchmaker that gets to know them through conversation — spoken or typed — rather than forms. That understanding is captured in a Compatibility Graph: a structured, continuously evolving model of the user's facts, preferences, and inferred values, each with confidence scores, supporting evidence, timestamps, and user confirmation. The public profile is only one view of that graph, not the graph itself.

The AI Matchmaker keeps learning for as long as the user is on the platform. It is available to chat at any time — to help, to answer questions, to give advice — and every conversation is an opportunity to refine the graph, always with the user's confirmation before anything changes.

Matching is performed against the Compatibility Graph rather than profile fields, and users receive compatibility explanations, not just a score.

This is the Version 1 product vision. See [prd.md](prd.md) for how it's currently being built.

## Guiding Principles

- **The AI works for the user.** It never optimizes for time spent in the app. Its goal is to help the user find a compatible long-term partner as efficiently as possible.
- **The Compatibility Graph is the source of truth.** The public profile is a view of the graph, not the other way around.
- **Analyze, explain, recommend, decide.** Across the product, the AI analyzes, explains its reasoning, and recommends — but the user always makes the final call. The AI never silently changes the user's profile or Compatibility Graph; whenever it believes something should change, it asks first.
- **Confidence over completeness.** The onboarding interview ends when the AI is sufficiently confident it understands the user, not after a fixed number of questions.
- **Conversation instead of forms.** Users may speak or type; the AI asks dynamic follow-up questions rather than presenting static fields.
- **Compatibility is explained, not just scored.** Users receive compatibility explanations rather than only a compatibility score.

## Non-Goals

The AI Matchmaker does not optimize for engagement or time spent in the app (see Guiding Principles above).
