# Feature specification: Intake foundation

## Problem

A person should be able to send ordinary conversational messages in a dedicated chat/group and have those messages become durable requests that can later be triaged in ChatGPT. The transport provider must be replaceable.

## Goals

- establish a channel-independent domain;
- receive normalized inbound messages;
- guarantee idempotent ingestion;
- separate messages from request aggregates;
- prepare PostgreSQL persistence;
- establish Telegram as the first adapter;
- define a human-readable Drive/Markdown projection boundary.

## Non-goals

- production Telegram bot provisioning;
- Discord or WhatsApp implementations;
- automatic LLM classification;
- MCP server implementation;
- Drive OAuth/API integration;
- production deployment.

## User scenarios

### Conversational burst

A friend sends five consecutive messages and one attachment. Zapizapi records six inbound facts but may associate them with one open `IntakeRequest`.

### Webhook retry

Telegram retries the same event. Zapizapi recognizes the external message key and does not create a duplicate.

### Future provider

A WhatsApp adapter produces the same `InboundMessage` contract, so the intake core does not change.

## Functional requirements

- FR-001: every adapter MUST normalize provider payloads into provider-independent `InboundMessage` values.
- FR-002: every persisted message MUST have a unique `(channel, conversationId, externalMessageId)` identity.
- FR-003: ingestion MUST be idempotent.
- FR-004: request aggregation MUST happen after message normalization.
- FR-005: request status MUST support `NEW`, `COLLECTING`, `READY`, `TRIAGING`, `TRIAGED`, `ARCHIVED`.
- FR-006: attachment metadata MUST be represented without requiring immediate binary download.
- FR-007: Google Drive/Markdown MUST be treated as a rebuildable projection.
- FR-008: Telegram webhook secret validation MUST occur at the Telegram adapter boundary.

## Acceptance criteria

- workspace typechecks;
- Telegram update normalization has unit coverage;
- persistence schema contains inbound messages, requests and their relation;
- API exposes a health endpoint;
- architecture and constitution are committed with the code.

## Edge cases

- webhook without a `message` update;
- messages without text but with attachments;
- group/topic messages;
- sender username absent;
- duplicate delivery;
- future edited/deleted provider messages.
