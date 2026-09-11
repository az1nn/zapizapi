import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { IntakeService } from '@zapizapi/application';
import type { InboundMessage } from '@zapizapi/domain';

import { createDatabase } from './database.js';
import {
  PostgresIntakeRequestRepository,
  PostgresMessageRepository,
} from './repositories.js';

const databaseUrl = process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite('PostgreSQL intake repositories', () => {
  if (!databaseUrl) return;

  const { db, client } = createDatabase(databaseUrl);
  const messages = new PostgresMessageRepository(db);
  const requests = new PostgresIntakeRequestRepository(db);
  const service = new IntakeService(messages, requests, 45_000);

  beforeEach(async () => {
    await client.unsafe(
      'TRUNCATE TABLE intake_request_messages, inbound_messages, intake_requests RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    await client.end();
  });

  function message(
    externalMessageId: string,
    receivedAt: Date,
  ): InboundMessage {
    return {
      channel: 'telegram',
      externalMessageId,
      conversationId: '-100123',
      author: { externalId: '42', displayName: 'Ada' },
      sentAt: receivedAt,
      receivedAt,
      text: `message-${externalMessageId}`,
      attachments: [],
    };
  }

  it('deduplicates retries and aggregates messages inside the window', async () => {
    const t0 = new Date('2026-09-11T18:00:00.000Z');
    const first = message('1', t0);
    const second = message('2', new Date(t0.getTime() + 10_000));

    const initial = await service.ingest([first, second]);
    const retry = await service.ingest([first]);

    expect(initial.accepted).toBe(2);
    expect(initial.requestIds).toHaveLength(1);
    expect(retry).toEqual({ accepted: 0, duplicates: 1, requestIds: [] });

    const request = await requests.getById(initial.requestIds[0]!);
    expect(request?.messageIds).toEqual(['1', '2']);
  });

  it('creates a new request after the aggregation window expires', async () => {
    const t0 = new Date('2026-09-11T18:00:00.000Z');
    const first = await service.ingest([message('1', t0)]);
    const second = await service.ingest([
      message('2', new Date(t0.getTime() + 60_000)),
    ]);

    expect(first.requestIds).toHaveLength(1);
    expect(second.requestIds).toHaveLength(1);
    expect(second.requestIds[0]).not.toBe(first.requestIds[0]);
  });
});
