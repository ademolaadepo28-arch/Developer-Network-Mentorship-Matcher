import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SyncWorkerQueue } from '../services/sync.worker.js';

export async function syncRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/sync
   * Enqueues background crawl of authenticated developer's GitHub repositories.
   * Spec Section 7
   */
  fastify.post(
    '/api/v1/sync',
    {
      preHandler: [fastify.authenticate],
      schema: {
        response: {
          202: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              job: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  handle: { type: 'string' },
                  status: { type: 'string' },
                  enqueuedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const worker = SyncWorkerQueue.getInstance();
      const job = worker.enqueue(user.id, user.handle);

      return reply.status(202).send({
        message: 'Background repository sync enqueued successfully',
        job,
      });
    }
  );

  /**
   * GET /api/v1/sync/status
   * Returns current sync job status and queue telemetry
   */
  fastify.get(
    '/api/v1/sync/status',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const worker = SyncWorkerQueue.getInstance();
      const job = worker.getStatus(user.id);
      const queueStats = worker.getQueueStats();

      return reply.send({
        userJob: job || { status: 'idle', userId: user.id },
        queueStats,
      });
    }
  );
}
