import Fastify from 'fastify';

export function buildServer() {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'zapizapi',
  }));

  return app;
}

const app = buildServer();
const port = Number(process.env.PORT ?? 3000);

if (process.env.NODE_ENV !== 'test') {
  await app.listen({ host: '0.0.0.0', port });
}
