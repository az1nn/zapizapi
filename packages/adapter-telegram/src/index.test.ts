import { describe, expect, it } from 'vitest';
import { TelegramAdapter } from './index.js';

const receivedAt = new Date('2026-09-11T18:00:00.000Z');

describe('TelegramAdapter', () => {
  it('normalizes a group text message', async () => {
    const adapter = new TelegramAdapter('secret');
    const envelope = {
      headers: { 'x-telegram-bot-api-secret-token': 'secret' },
      receivedAt,
      payload: {
        update_id: 100,
        message: {
          message_id: 7,
          date: 1_757_614_400,
          chat: { id: -123 },
          from: { id: 42, first_name: 'Ada', username: 'ada' },
          text: 'Documenta essa ideia',
        },
      },
    };

    expect(await adapter.verifyWebhook(envelope)).toBe(true);
    expect(await adapter.normalize(envelope)).toEqual([
      expect.objectContaining({
        channel: 'telegram',
        externalMessageId: '7',
        externalEventId: '100',
        conversationId: '-123',
        text: 'Documenta essa ideia',
        attachments: [],
      }),
    ]);
  });

  it('uses the largest photo reference and caption', async () => {
    const adapter = new TelegramAdapter();
    const result = await adapter.normalize({
      headers: {},
      receivedAt,
      payload: {
        update_id: 101,
        message: {
          message_id: 8,
          date: 1_757_614_400,
          chat: { id: -123 },
          from: { id: 42, first_name: 'Ada' },
          caption: 'olha essa referência',
          photo: [{ file_id: 'small' }, { file_id: 'large', file_size: 1000 }],
        },
      },
    });

    expect(result[0]?.attachments).toEqual([
      { remoteId: 'large', kind: 'image', sizeBytes: 1000 },
    ]);
    expect(result[0]?.text).toBe('olha essa referência');
  });
});
