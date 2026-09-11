import type { Channel, InboundMessage } from '@zapizapi/domain';

export interface WebhookEnvelope {
  readonly headers: Readonly<Record<string, string | undefined>>;
  readonly payload: unknown;
  readonly receivedAt: Date;
}

export interface MessagingAdapter {
  readonly channel: Channel;

  verifyWebhook(envelope: WebhookEnvelope): Promise<boolean>;

  normalize(envelope: WebhookEnvelope): Promise<readonly InboundMessage[]>;

  downloadAttachment?(remoteId: string): Promise<Uint8Array>;
}
