import type {
  AttachmentKind,
  AttachmentRef,
  InboundMessage,
} from '@zapizapi/domain';
import type {
  MessagingAdapter,
  WebhookEnvelope,
} from '@zapizapi/messaging-core';

interface TelegramFileLike {
  file_id?: unknown;
  file_name?: unknown;
  mime_type?: unknown;
  file_size?: unknown;
}

interface TelegramMessageLike {
  message_id?: unknown;
  message_thread_id?: unknown;
  date?: unknown;
  text?: unknown;
  caption?: unknown;
  chat?: { id?: unknown };
  from?: {
    id?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    username?: unknown;
  };
  photo?: TelegramFileLike[];
  document?: TelegramFileLike;
  audio?: TelegramFileLike;
  voice?: TelegramFileLike;
  video?: TelegramFileLike;
}

interface TelegramUpdateLike {
  update_id?: unknown;
  message?: TelegramMessageLike;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function attachment(
  file: TelegramFileLike | undefined,
  kind: AttachmentKind,
): AttachmentRef | undefined {
  if (!file) return undefined;
  const remoteId = asString(file.file_id);
  if (!remoteId) return undefined;

  const result: AttachmentRef = { remoteId, kind };
  const mimeType = asString(file.mime_type);
  const fileName = asString(file.file_name);
  const sizeBytes = asFiniteNumber(file.file_size);

  return {
    ...result,
    ...(mimeType ? { mimeType } : {}),
    ...(fileName ? { fileName } : {}),
    ...(sizeBytes !== undefined ? { sizeBytes } : {}),
  };
}

function normalizeAttachments(message: TelegramMessageLike): AttachmentRef[] {
  const values: Array<AttachmentRef | undefined> = [];
  const photos = Array.isArray(message.photo) ? message.photo : [];
  const bestPhoto = photos.at(-1);

  values.push(attachment(bestPhoto, 'image'));
  values.push(attachment(message.document, 'document'));
  values.push(attachment(message.audio, 'audio'));
  values.push(attachment(message.voice, 'voice'));
  values.push(attachment(message.video, 'video'));

  return values.filter((value): value is AttachmentRef => Boolean(value));
}

export class TelegramAdapter implements MessagingAdapter {
  readonly channel = 'telegram' as const;

  constructor(private readonly webhookSecret?: string) {}

  async verifyWebhook(envelope: WebhookEnvelope): Promise<boolean> {
    if (!this.webhookSecret) return true;
    return (
      envelope.headers['x-telegram-bot-api-secret-token'] === this.webhookSecret
    );
  }

  async normalize(envelope: WebhookEnvelope): Promise<readonly InboundMessage[]> {
    if (!envelope.payload || typeof envelope.payload !== 'object') return [];

    const update = envelope.payload as TelegramUpdateLike;
    const message = update.message;
    if (!message) return [];

    const messageId = asFiniteNumber(message.message_id);
    const chatId = asFiniteNumber(message.chat?.id);
    const authorId = asFiniteNumber(message.from?.id);
    const unixDate = asFiniteNumber(message.date);

    if (
      messageId === undefined ||
      chatId === undefined ||
      authorId === undefined ||
      unixDate === undefined
    ) {
      return [];
    }

    const firstName = asString(message.from?.first_name);
    const lastName = asString(message.from?.last_name);
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    const username = asString(message.from?.username);
    const text = asString(message.text) ?? asString(message.caption);
    const threadId = asFiniteNumber(message.message_thread_id);
    const updateId = asFiniteNumber(update.update_id);

    const normalized: InboundMessage = {
      channel: this.channel,
      externalMessageId: String(messageId),
      conversationId: String(chatId),
      author: {
        externalId: String(authorId),
        ...(displayName ? { displayName } : {}),
        ...(username ? { username } : {}),
      },
      sentAt: new Date(unixDate * 1000),
      receivedAt: envelope.receivedAt,
      attachments: normalizeAttachments(message),
      ...(text ? { text } : {}),
      ...(threadId !== undefined ? { threadId: String(threadId) } : {}),
      ...(updateId !== undefined ? { externalEventId: String(updateId) } : {}),
    };

    return [normalized];
  }
}
