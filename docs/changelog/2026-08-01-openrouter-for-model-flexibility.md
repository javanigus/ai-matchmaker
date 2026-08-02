# 2026-08-01 — OpenRouter instead of a direct provider API

## What changed

**`docs/technical-plan.md`:** the "Recommended stack" now routes all LLM calls through **OpenRouter** instead of integrating the Anthropic Claude API directly. One API key and one request format cover any supported model (Claude, GPT, Gemini, Llama, etc.), so the model behind the AI Matchmaker can be swapped by changing a model-name string rather than rewriting a provider integration. Noted two tradeoffs: OpenRouter adds a small per-token markup over the underlying provider's price, and structured-output/tool-calling reliability still varies by the underlying model even through OpenRouter — so the plan still recommends defaulting to a model known to be strong at it, and treating a swap to a cheaper/faster model as something to validate against real output quality first.

## Why it changed

Founder decision: wants to be able to switch which AI model powers the product without changing API keys or provider integrations — OpenRouter's unified API is built exactly for that, at the cost of a small markup and one extra network hop.
