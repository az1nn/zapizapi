# Spec 002 — Telegram Intake

## Goal

Turn a Telegram webhook delivery into a durable, channel-agnostic intake request without requiring an LLM in the ingestion path.

## User story

When a participant sends one or more Telegram messages to the configured group, Zapizapi must accept the webhook, normalize the updates, persist each unique message once and group nearby messages into a single intake request for later triage in ChatGPT.

## Functional requirements

1. Expose `POST /webhooks/telegram`.
2. Validate `X-Telegram-Bot-Api-Secret-Token` when a webhook secret is configured.
3. Normalize supported Telegram messages through `TelegramAdapter`.
4. Deduplicate messages by channel + conversation + external message id.
5. Persist accepted messages in PostgreSQL before aggregation.
6. Aggregate messages from the same channel/conversation into the latest `NEW` or `COLLECTING` request when they arrive within the configured aggregation window.
7. Default aggregation window to 45 seconds.
8. Serialize aggregation per channel/conversation to prevent duplicate requests during concurrent webhook deliveries.
9. Return HTTP 202 with accepted, duplicate and request id counts.
10. Keep PostgreSQL as the source of truth; no Drive or LLM call is required by this slice.

## Non-functional requirements

- Webhook retries must be safe.
- Provider details must remain isolated in the Telegram adapter.
- The API must support dependency injection for route-level tests.
- CI must validate repository behavior against a real PostgreSQL service.

## Acceptance scenarios

### Duplicate retry

Given Telegram retries the same message, only the first delivery is persisted and attached to an intake request; the retry is reported as a duplicate.

### Conversation burst

Given two messages from the same conversation arrive 10 seconds apart, both are attached to the same intake request.

### Window expiry

Given a second message arrives 60 seconds after the first with a 45-second window, a new intake request is created.

### Invalid webhook secret

Given the configured Telegram secret does not match the request header, the API returns 401 and does not invoke ingestion.
