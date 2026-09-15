import { describe, expect, it, vi } from 'vitest';
import { TelegramAdapter } from '@zapizapi/adapter-telegram';

import { buildServer } from './server.js';

describe('Telegram webhook', () => {
  it('rejects an invalid Telegram webhook secret', async () => {
    const ingest = vi.fn();
    const app = buildServer({
      intake: { ingest },
      telegram: new TelegramAdapter('expected-secret'),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/telegram',
      headers: {
        'x-telegram-bot-api-secret-token': 'wrong-secret',
      },
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
    await app.close();
  });

  it('normalizes and ingests a valid Telegram update', async () => {
    const ingest = vi.fn(async (messages) => ({
      accepted: messages.length,
      duplicates: 0,
      requestIds: ['request-1'],
    }));
    const app = buildServer({
      intake: { ingest },
      telegram: new TelegramAdapter('secret'),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/telegram',
      headers: {
        'x-telegram-bot-api-secret-token': 'secret',
      },
      payload: {
        update_id: 100,
        message: {
          message_id: 10,
          date: 1_789_150_000,
          chat: { id: -100123 },
          from: { id: 42, first_name: 'Ada' },
          text: 'Documente esta ideia',
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({
      accepted: 1,
      duplicates: 0,
      requestIds: ['request-1'],
    });
    expect(ingest).toHaveBeenCalledTimes(1);
    expect(ingest.mock.calls[0]![0][0]).toMatchObject({
      channel: 'telegram',
      externalMessageId: '10',
      conversationId: '-100123',
      text: 'Documente esta ideia',
    });
    await app.close();
  });
});
