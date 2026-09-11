# zapizapi

Channel-agnostic intake pipeline for turning messages from Telegram, Discord and WhatsApp into durable requests that can be triaged in ChatGPT.

## Architecture

```text
Messaging channel
      |
      v
Channel adapter
      |
      v
 Intake Core  ---> PostgreSQL (source of truth)
      |
      +-------> projections (Google Drive / Markdown)
      |
      +-------> MCP / ChatGPT (future)
```

Messaging providers are adapters. The domain never depends on Telegram, Discord, WhatsApp, n8n or Google Drive.

## Foundation stack

- TypeScript + Node.js
- Fastify API
- Ports & Adapters / Hexagonal Architecture
- PostgreSQL + Drizzle schema
- Telegram as the first messaging adapter
- Google Drive/Markdown as a projection boundary
- Spec Kit-style specs under `specs/`
- pnpm workspaces

## Repository layout

```text
apps/api                    HTTP entrypoint
packages/domain             domain model
packages/application        use cases and ports
packages/messaging-core     messaging adapter contract
packages/adapter-telegram   first channel adapter
packages/persistence        Drizzle/PostgreSQL schema
packages/projection-google-drive  Markdown projection boundary
specs/                      feature specifications
.specify/                   project constitution/templates
```

## Development

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm typecheck
pnpm test
pnpm dev
```

The first API endpoint is `GET /health`.

## Design rules

1. Raw inbound messages are immutable facts.
2. An `IntakeRequest` is a separate aggregate built from one or more messages.
3. Delivery must be idempotent because webhook providers can retry.
4. n8n is integration glue, never the source of business rules.
5. PostgreSQL is the source of truth; Drive is a human-readable projection.
6. AI is not required in the ingestion path. Triaging remains a ChatGPT concern.

See [`docs/architecture/overview.md`](docs/architecture/overview.md) and [`specs/001-foundation/spec.md`](specs/001-foundation/spec.md).
