# Architecture overview

Zapizapi receives conversational messages and turns them into durable units of work for later triage in ChatGPT.

## Context

```text
Telegram ----\
Discord ------> MessagingAdapter -> Intake Core -> PostgreSQL
WhatsApp ----/                         |      \
                                      |       -> Google Drive / Markdown
                                      -> future MCP -> ChatGPT
```

## Boundaries

### Domain

Contains provider-independent concepts such as `InboundMessage`, `AttachmentRef`, `IntakeRequest` and lifecycle status.

### Application

Owns ingestion use cases and ports. It coordinates idempotent persistence and association of messages with open requests.

### Messaging

Every provider implements `MessagingAdapter`. Adapters verify provider webhooks and normalize provider payloads into `InboundMessage`.

### Persistence

PostgreSQL is authoritative. Webhook retries must not duplicate messages. The persistence layer therefore maintains a unique external message key.

### Projection

Google Drive is deliberately a projection, not the database. Markdown is generated from normalized request data so ChatGPT and humans can consume the same representation.

## Aggregation

One chat burst can contain many messages but represent one request. Aggregation therefore happens after normalization and persistence. The application port `appendToOpenRequest` is designed to support a configurable inactivity window without coupling the domain to a scheduler.

## n8n

n8n may receive a provider webhook and forward it to the API, or orchestrate deployment-specific integrations. It must not own deduplication, request lifecycle or aggregation rules.

## Security baseline

- secrets only through environment/secret stores;
- webhook authentication at adapter boundary;
- raw provider payloads should be retained only when required for audit/debugging;
- attachment downloads are separate from message normalization;
- least-privilege credentials per external provider.
