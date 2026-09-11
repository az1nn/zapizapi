import type { InboundMessage, IntakeRequest } from '@zapizapi/domain';

export interface DriveWriter {
  writeMarkdown(path: string, markdown: string): Promise<void>;
}

function yamlValue(value: string): string {
  return JSON.stringify(value);
}

export function renderRequestMarkdown(
  request: IntakeRequest,
  messages: readonly InboundMessage[],
): string {
  const lines = [
    '---',
    `id: ${yamlValue(request.id)}`,
    `status: ${yamlValue(request.status)}`,
    `source: ${yamlValue(request.sourceChannel)}`,
    `conversation_id: ${yamlValue(request.conversationId)}`,
    `created_at: ${yamlValue(request.createdAt.toISOString())}`,
    '---',
    '',
    '# Intake request',
    '',
    '## Conversation',
    '',
  ];

  for (const message of messages) {
    const author = message.author.displayName ?? message.author.username ?? message.author.externalId;
    lines.push(`### ${author}`);
    lines.push('');
    if (message.text) lines.push(message.text, '');
    if (message.attachments.length > 0) {
      lines.push('Attachments:');
      for (const item of message.attachments) {
        lines.push(`- ${item.kind}: ${item.fileName ?? item.remoteId}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trimEnd()}\n`;
}
