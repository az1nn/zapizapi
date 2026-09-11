# Plan 002 — Telegram Intake

## Design

The API builds a provider-neutral webhook envelope and delegates Telegram-specific verification/normalization to `TelegramAdapter`. `IntakeService` remains the application orchestrator. PostgreSQL implementations satisfy the existing message and request repository ports.

## Persistence strategy

`PostgresMessageRepository.saveIfAbsent` relies on the unique inbound-message identity already defined in the schema. `PostgresIntakeRequestRepository.appendToOpenRequest` uses a PostgreSQL transaction plus a transaction-scoped advisory lock keyed by channel/conversation. This serializes competing deliveries for one conversation while allowing unrelated conversations to proceed concurrently.

Aggregation uses `receivedAt`, not the provider timestamp, so the batching window reflects arrival to Zapizapi and is not affected by delayed or inaccurate client timestamps.

## Validation

- API tests: secret validation and Telegram normalization/ingestion wiring.
- PostgreSQL integration tests: deduplication, same-window aggregation and window expiry.
- CI: PostgreSQL 17 service, schema push, typecheck and all tests.

## Deferred

- attachment download/storage
- request READY transition after inactivity
- Drive Markdown projection execution
- outbound replies
- n8n workflow export
