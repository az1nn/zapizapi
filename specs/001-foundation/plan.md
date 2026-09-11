# Implementation plan: Intake foundation

## Architecture

Use a pnpm TypeScript monorepo with Ports & Adapters boundaries.

## Packages

- `domain`: immutable provider-independent model.
- `application`: ingestion orchestration and ports.
- `messaging-core`: channel adapter contract.
- `adapter-telegram`: Telegram normalization and webhook verification.
- `persistence`: Drizzle PostgreSQL schema.
- `projection-google-drive`: deterministic Markdown renderer and future Drive writer port.
- `apps/api`: Fastify process boundary.

## Delivery slices

1. Foundation contracts and schema.
2. Telegram webhook HTTP route plus persistence implementation.
3. Aggregation policy and request lifecycle.
4. Google Drive projection implementation.
5. MCP bridge.
6. Additional channel adapters.

## Validation

Each slice must pass typechecking and focused unit tests before merge.
