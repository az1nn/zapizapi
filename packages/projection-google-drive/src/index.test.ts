import { describe, expect, it } from 'vitest';
import { renderRequestMarkdown } from './index.js';

describe('renderRequestMarkdown', () => {
  it('renders normalized conversation content', () => {
    const markdown = renderRequestMarkdown(
      {
        id: 'req-1',
        status: 'READY',
        sourceChannel: 'telegram',
        conversationId: '-123',
        messageIds: ['msg-1'],
        createdAt: new Date('2026-09-11T18:00:00Z'),
        updatedAt: new Date('2026-09-11T18:00:01Z'),
      },
      [
        {
          channel: 'telegram',
          externalMessageId: '1',
          conversationId: '-123',
          author: { externalId: '42', displayName: 'Ada' },
          sentAt: new Date('2026-09-11T18:00:00Z'),
          receivedAt: new Date('2026-09-11T18:00:01Z'),
          text: 'Crie uma documentação sobre isso.',
          attachments: [],
        },
      ],
    );

    expect(markdown).toContain('# Intake request');
    expect(markdown).toContain('### Ada');
    expect(markdown).toContain('Crie uma documentação sobre isso.');
  });
});
