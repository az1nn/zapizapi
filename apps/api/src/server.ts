import Fastify from 'fastify';
import { TelegramAdapter } from '@zapizapi/adapter-telegram';
import { IntakeService } from '@zapizapi/application';
import {
  createDatabase,
  PostgresIntakeRequestRepository,
  PostgresMessageRepository,
} from '@zapizapi/persistence';

export interface ServerOptions {
  readonly intake: Pick<IntakeService, 'ingest'>;
  readonly telegram: TelegramAdapter;
}

function normalizeHeaders(
  headers: Readonly<Record<string, string | string[] | undefined>>,
): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

export function buildServer(options: ServerOptions) {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'zapizapi',
  }));

  app.post('/webhooks/telegram', async (request, reply) => {
    const envelope = {
      headers: normalizeHeaders(request.headers),
      payload: request.body,
      receivedAt: new Date(),
    };

    if (!(await options.telegram.verifyWebhook(envelope))) {
      return reply.code(401).send({ error: 'invalid_webhook_secret' });
    }

    const messages = await options.telegram.normalize(envelope);
    const result = await options.intake.ingest(messages);

    return reply.code(202).send(result);
  });

  return app;
}

function aggregationWindowMs(): number {
  const value = Number(process.env.AGGREGATION_WINDOW_MS ?? 45_000);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('AGGREGATION_WINDOW_MS must be a non-negative number');
  }
  return value;
}

async function start() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const { db, client } = createDatabase(databaseUrl);
  const intake = new IntakeService(
    new PostgresMessageRepository(db),
    new PostgresIntakeRequestRepository(db),
    aggregationWindowMs(),
  );
  const telegram = new TelegramAdapter(process.env.TELEGRAM_WEBHOOK_SECRET);
  const app = buildServer({ intake, telegram });

  app.addHook('onClose', async () => {
    await client.end();
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen({ host: '0.0.0.0', port });
}

if (process.env.NODE_ENV !== 'test') {
  await start();
}
