import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { UserSession } from '../types/index.js';

export default fp(async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      let token: string | undefined;

      // Check cookie first (as per Spec Section 3: httpOnly, Secure, SameSite=Lax cookie)
      if (request.cookies && request.cookies.session_token) {
        token = request.cookies.session_token;
      } else if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
        token = request.headers.authorization.substring(7);
      }

      if (!token) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication session required',
        });
      }

      try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET) as UserSession;
        request.user = decoded;
      } catch (err) {
        return reply.status(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Invalid or expired session token',
        });
      }
    }
  );

  fastify.decorate(
    'requireJunior',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // First ensure authenticated
      await (fastify as any).authenticate(request, reply);
      if (reply.sent) return;

      const role = request.user?.role;
      if (role !== 'mentee' && role !== 'both' && role !== 'undecided') {
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'This endpoint is restricted to junior / mentee developers',
        });
      }
    }
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireJunior: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
