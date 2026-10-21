import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { initDb } from './db/client.js';
import authPlugin from './plugins/auth.plugin.js';
import { authRoutes } from './routes/auth.routes.js';
import { syncRoutes } from './routes/sync.routes.js';
import { matchRoutes } from './routes/match.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: ENV.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        ENV.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // CORS configuration
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Cookie parsing & signing
  await fastify.register(cookie, {
    secret: ENV.COOKIE_SECRET,
    hook: 'onRequest',
  });

  // Register authentication decorator plugin
  await fastify.register(authPlugin);

  // Health check endpoint for Fly.io machines
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'Developer Network & Mentorship Matcher API',
      version: '1.0.0',
    };
  });

  // Register API routes
  await fastify.register(authRoutes);
  await fastify.register(syncRoutes);
  await fastify.register(matchRoutes);

  // Serve static assets in production if client/dist exists
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    await fastify.register(fastifyStatic, {
      root: clientDist,
      prefix: '/',
    });

    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'Endpoint not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return fastify;
}

async function start() {
  try {
    console.log('Initializing database tables and indexes...');
    await initDb();

    const server = await buildServer();
    await server.listen({ port: ENV.PORT, host: '0.0.0.0' });
    console.log(`🚀 Fastify Server listening on http://0.0.0.0:${ENV.PORT}`);
  } catch (err) {
    console.error('Fatal server startup error:', err);
    process.exit(1);
  }
}

// Start if executed directly
if (process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'))) {
  start();
}
