export type Channel = 'telegram' | 'discord' | 'whatsapp';

export type AttachmentKind =
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'other';

export interface AttachmentRef {
  readonly remoteId: string;
  readonly kind: AttachmentKind;
  readonly mimeType?: string;
  readonly fileName?: string;
  readonly sizeBytes?: number;
}

export interface InboundAuthor {
  readonly externalId: string;
  readonly displayName?: string;
  readonly username?: string;
}

export interface InboundMessage {
  readonly channel: Channel;
  readonly externalMessageId: string;
  readonly externalEventId?: string;
  readonly conversationId: string;
  readonly threadId?: string;
  readonly author: InboundAuthor;
  readonly sentAt: Date;
  readonly receivedAt: Date;
  readonly text?: string;
  readonly attachments: readonly AttachmentRef[];
}

export const INTAKE_REQUEST_STATUSES = [
  'NEW',
  'COLLECTING',
  'READY',
  'TRIAGING',
  'TRIAGED',
  'ARCHIVED',
] as const;

export type IntakeRequestStatus = (typeof INTAKE_REQUEST_STATUSES)[number];

export interface IntakeRequest {
  readonly id: string;
  readonly status: IntakeRequestStatus;
  readonly sourceChannel: Channel;
  readonly conversationId: string;
  readonly messageIds: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function externalMessageKey(message: InboundMessage): string {
  return `${message.channel}:${message.conversationId}:${message.externalMessageId}`;
}
