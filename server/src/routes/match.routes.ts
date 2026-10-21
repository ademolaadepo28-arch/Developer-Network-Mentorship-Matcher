import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../db/client.js';
import { ENV } from '../config/env.js';

interface FeedQueryParams {
  threshold?: string;
  language?: string;
  topic?: string;
  status?: string;
}

export async function matchRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/matches/feed
   * Returns ranked collection of mentors sorted by pre-computed composite score.
   * Spec Section 7
   */
  fastify.get<{ Querystring: FeedQueryParams }>(
    '/api/v1/matches/feed',
    { preHandler: [fastify.requireJunior] },
    async (request: FastifyRequest<{ Querystring: FeedQueryParams }>, reply: FastifyReply) => {
      const juniorId = request.user!.id;
      const { threshold, language, topic, status } = request.query;
      const minThreshold = threshold !== undefined ? parseFloat(threshold) : ENV.MATCH_AFFINITY_THRESHOLD;

      const db = await getDb();

      let query = `
        SELECT 
          m.id AS match_id,
          m.score,
          m.status,
          m.breakdown,
          m.updated_at,
          u.id AS mentor_id,
          u.handle AS mentor_handle,
          u.avatar_url AS mentor_avatar_url,
          u.bio AS mentor_bio,
          p.languages AS mentor_languages,
          p.topics AS mentor_topics,
          p.commit_activity AS mentor_commit_activity,
          p.repo_count AS mentor_repo_count
        FROM matches m
        JOIN users u ON u.id = m.mentor_id
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE m.junior_id = $1
          AND m.score >= $2
      `;

      const params: any[] = [juniorId, minThreshold];

      if (status && status !== 'all') {
        params.push(status);
        query += ` AND m.status = $${params.length}`;
      }

      query += ` ORDER BY m.score DESC, p.commit_activity DESC`;

      const result = await db.query<any>(query, params);

      let matches = result.rows.map(row => {
        const breakdown = typeof row.breakdown === 'string' ? JSON.parse(row.breakdown) : row.breakdown;
        const languages = typeof row.mentor_languages === 'string' ? JSON.parse(row.mentor_languages) : row.mentor_languages;

        return {
          id: row.match_id,
          score: parseFloat(row.score),
          status: row.status,
          updatedAt: row.updated_at,
          breakdown,
          mentor: {
            id: row.mentor_id,
            handle: row.mentor_handle,
            avatarUrl: row.mentor_avatar_url,
            bio: row.mentor_bio,
            languages: languages || {},
            topics: row.mentor_topics || [],
            commitActivity: row.mentor_commit_activity || 0,
            repoCount: row.mentor_repo_count || 0,
          },
        };
      });

      // Filter by language if chip selected
      if (language) {
        const langLower = language.toLowerCase();
        matches = matches.filter(m => 
          Object.keys(m.mentor.languages).some(l => l.toLowerCase() === langLower)
        );
      }

      // Filter by topic if chip selected
      if (topic) {
        const topicLower = topic.toLowerCase();
        matches = matches.filter(m => 
          m.mentor.topics.some((t: string) => t.toLowerCase() === topicLower)
        );
      }

      return reply.send({
        threshold: minThreshold,
        total: matches.length,
        matches,
      });
    }
  );

  /**
   * POST /api/v1/matches/:id/request
   * Sends mentorship request and transitions record status to 'requested'.
   * Spec Section 7
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/matches/:id/request',
    {
      preHandler: [fastify.requireJunior],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const juniorId = request.user!.id;
      const db = await getDb();

      // Ensure the match belongs to this junior user
      const matchRes = await db.query(
        'SELECT id, junior_id, mentor_id, score, status FROM matches WHERE id = $1 AND junior_id = $2',
        [id, juniorId]
      );

      if (matchRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Match record not found or access denied' });
      }

      const match = matchRes.rows[0];

      if (match.status === 'accepted') {
        return reply.status(400).send({ error: 'Mentorship already active and accepted' });
      }

      await db.query(
        "UPDATE matches SET status = 'requested', updated_at = NOW() WHERE id = $1",
        [id]
      );

      return reply.send({
        success: true,
        matchId: id,
        previousStatus: match.status,
        status: 'requested',
        message: 'Mentorship request sent successfully',
      });
    }
  );

  /**
   * POST /api/v1/matches/:id/accept
   * Transitions record status to 'accepted' (for mentor view or interactive demo)
   */
  fastify.post<{ Params: { id: string } }>(
    '/api/v1/matches/:id/accept',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const db = await getDb();

      const matchRes = await db.query(
        'SELECT id, junior_id, mentor_id, status FROM matches WHERE id = $1',
        [id]
      );

      if (matchRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Match record not found' });
      }

      await db.query(
        "UPDATE matches SET status = 'accepted', updated_at = NOW() WHERE id = $1",
        [id]
      );

      return reply.send({
        success: true,
        matchId: id,
        status: 'accepted',
        message: 'Mentorship connection accepted!',
      });
    }
  );

  /**
   * GET /api/v1/matches/:id/breakdown
   * Returns exact mathematical explanation for a match
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/matches/:id/breakdown',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const db = await getDb();

      const matchRes = await db.query(
        `SELECT m.id, m.score, m.status, m.breakdown,
                j.handle as junior_handle,
                mt.handle as mentor_handle
         FROM matches m
         JOIN users j ON j.id = m.junior_id
         JOIN users mt ON mt.id = m.mentor_id
         WHERE m.id = $1`,
        [id]
      );

      if (matchRes.rows.length === 0) {
        return reply.status(404).send({ error: 'Match not found' });
      }

      const row = matchRes.rows[0];
      const breakdown = typeof row.breakdown === 'string' ? JSON.parse(row.breakdown) : row.breakdown;

      return reply.send({
        matchId: row.id,
        score: parseFloat(row.score),
        status: row.status,
        juniorHandle: row.junior_handle,
        mentorHandle: row.mentor_handle,
        breakdown,
      });
    }
  );

  /**
   * GET /api/v1/mentors
   * Public / Authenticated directory of mentors
   */
  fastify.get('/api/v1/mentors', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const mentorsRes = await db.query(
      `SELECT u.id, u.handle, u.avatar_url, u.bio, p.languages, p.topics, p.commit_activity, p.repo_count
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.role IN ('mentor', 'both')
       ORDER BY p.commit_activity DESC`
    );

    const mentors = mentorsRes.rows.map(row => ({
      ...row,
      languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : row.languages,
    }));

    return reply.send({ mentors });
  });
}
