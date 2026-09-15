import {
  and,
  desc,
  eq,
  gte,
  inArray,
  sql,
} from 'drizzle-orm';
import type {
  IntakeRequestRepository,
  MessageRepository,
} from '@zapizapi/application';
import type { InboundMessage, IntakeRequest } from '@zapizapi/domain';

import type { Database } from './database.js';
import {
  inboundMessages,
  intakeRequestMessages,
  intakeRequests,
} from './schema.js';

export class PostgresMessageRepository implements MessageRepository {
  constructor(private readonly db: Database) {}

  async saveIfAbsent(message: InboundMessage): Promise<boolean> {
    const inserted = await this.db
      .insert(inboundMessages)
      .values({
        channel: message.channel,
        externalMessageId: message.externalMessageId,
        externalEventId: message.externalEventId,
        conversationId: message.conversationId,
        threadId: message.threadId,
        authorExternalId: message.author.externalId,
        authorDisplayName: message.author.displayName,
        authorUsername: message.author.username,
        text: message.text,
        attachments: message.attachments,
        sentAt: message.sentAt,
        receivedAt: message.receivedAt,
      })
      .onConflictDoNothing()
      .returning({ id: inboundMessages.id });

    return inserted.length === 1;
  }
}

export class PostgresIntakeRequestRepository
  implements IntakeRequestRepository
{
  constructor(private readonly db: Database) {}

  async appendToOpenRequest(
    message: InboundMessage,
    aggregationWindowMs: number,
  ): Promise<string> {
    return this.db.transaction(async (tx) => {
      const lockKey = `${message.channel}:${message.conversationId}`;
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
      );

      const [storedMessage] = await tx
        .select({ id: inboundMessages.id })
        .from(inboundMessages)
        .where(
          and(
            eq(inboundMessages.channel, message.channel),
            eq(inboundMessages.conversationId, message.conversationId),
            eq(inboundMessages.externalMessageId, message.externalMessageId),
          ),
        )
        .limit(1);

      if (!storedMessage) {
        throw new Error('Inbound message must be persisted before aggregation');
      }

      const threshold = new Date(
        message.receivedAt.getTime() - aggregationWindowMs,
      );

      const [openRequest] = await tx
        .select({ id: intakeRequests.id })
        .from(intakeRequests)
        .where(
          and(
            eq(intakeRequests.sourceChannel, message.channel),
            eq(intakeRequests.conversationId, message.conversationId),
            inArray(intakeRequests.status, ['NEW', 'COLLECTING']),
            gte(intakeRequests.lastMessageAt, threshold),
          ),
        )
        .orderBy(desc(intakeRequests.lastMessageAt))
        .limit(1);

      let requestId = openRequest?.id;

      if (!requestId) {
        const [created] = await tx
          .insert(intakeRequests)
          .values({
            status: 'COLLECTING',
            sourceChannel: message.channel,
            conversationId: message.conversationId,
            lastMessageAt: message.receivedAt,
          })
          .returning({ id: intakeRequests.id });

        if (!created) {
          throw new Error('Failed to create intake request');
        }

        requestId = created.id;
      } else {
        await tx
          .update(intakeRequests)
          .set({
            status: 'COLLECTING',
            lastMessageAt: message.receivedAt,
            updatedAt: new Date(),
          })
          .where(eq(intakeRequests.id, requestId));
      }

      const [lastLink] = await tx
        .select({ sequence: intakeRequestMessages.sequence })
        .from(intakeRequestMessages)
        .where(eq(intakeRequestMessages.requestId, requestId))
        .orderBy(desc(intakeRequestMessages.sequence))
        .limit(1);

      await tx.insert(intakeRequestMessages).values({
        requestId,
        messageId: storedMessage.id,
        sequence: (lastLink?.sequence ?? 0) + 1,
      });

      return requestId;
    });
  }

  async getById(id: string): Promise<IntakeRequest | null> {
    const [request] = await this.db
      .select()
      .from(intakeRequests)
      .where(eq(intakeRequests.id, id))
      .limit(1);

    if (!request) return null;

    const messages = await this.db
      .select({ externalMessageId: inboundMessages.externalMessageId })
      .from(intakeRequestMessages)
      .innerJoin(
        inboundMessages,
        eq(intakeRequestMessages.messageId, inboundMessages.id),
      )
      .where(eq(intakeRequestMessages.requestId, id))
      .orderBy(intakeRequestMessages.sequence);

    return {
      id: request.id,
      status: request.status,
      sourceChannel: request.sourceChannel,
      conversationId: request.conversationId,
      messageIds: messages.map((message) => message.externalMessageId),
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }
}
