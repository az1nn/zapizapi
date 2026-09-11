# Zapizapi Constitution

## I. Channel independence

Messaging providers are replaceable adapters. No provider-specific type may leak into the domain or application layer.

## II. Durable intake

Inbound events are persisted idempotently before downstream work. PostgreSQL is the source of truth.

## III. Message and request are different concepts

A message is an immutable inbound fact. A request is an aggregate that can contain multiple messages and has a lifecycle.

## IV. Human-readable projections are projections

Drive/Markdown, Notion and future destinations may be rebuilt from authoritative state and cannot own workflow state.

## V. AI stays out of the critical ingestion path

The MVP must capture the sender's original intent without requiring an LLM. AI may enrich or triage after durable ingestion.

## VI. Spec-driven changes

Non-trivial behavior starts from a spec under `specs/<NNN>-<feature>/`. Architectural deviations require an ADR.

## VII. Testable boundaries

Adapters, application services and persistence must be independently testable. Provider payload fixtures belong to adapter tests.

**Version:** 1.0.0  
**Ratified:** 2026-09-11
