import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const channelEnum = pgEnum('channel', [
  'telegram',
  'discord',
  'whatsapp',
]);

export const requestStatusEnum = pgEnum('intake_request_status', [
  'NEW',
  'COLLECTING',
  'READY',
  'TRIAGING',
  'TRIAGED',
  'ARCHIVED',
]);

export const inboundMessages = pgTable(
  'inbound_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channel: channelEnum('channel').notNull(),
    externalMessageId: text('external_message_id').notNull(),
    externalEventId: text('external_event_id'),
    conversationId: text('conversation_id').notNull(),
    threadId: text('thread_id'),
    authorExternalId: text('author_external_id').notNull(),
    authorDisplayName: text('author_display_name'),
    authorUsername: text('author_username'),
    text: text('text'),
    attachments: jsonb('attachments').notNull().default([]),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('inbound_message_external_identity_uq').on(
      table.channel,
      table.conversationId,
      table.externalMessageId,
    ),
    index('inbound_message_conversation_idx').on(
      table.channel,
      table.conversationId,
      table.sentAt,
    ),
  ],
);

export const intakeRequests = pgTable(
  'intake_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: requestStatusEnum('status').notNull().default('NEW'),
    sourceChannel: channelEnum('source_channel').notNull(),
    conversationId: text('conversation_id').notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('intake_request_open_lookup_idx').on(
      table.sourceChannel,
      table.conversationId,
      table.status,
      table.lastMessageAt,
    ),
  ],
);

export const intakeRequestMessages = pgTable(
  'intake_request_messages',
  {
    requestId: uuid('request_id')
      .notNull()
      .references(() => intakeRequests.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id')
      .notNull()
      .references(() => inboundMessages.id, { onDelete: 'cascade' }),
    sequence: bigint('sequence', { mode: 'number' }).notNull(),
  },
  (table) => [
    uniqueIndex('intake_request_message_uq').on(table.requestId, table.messageId),
    uniqueIndex('intake_request_sequence_uq').on(table.requestId, table.sequence),
  ],
);
