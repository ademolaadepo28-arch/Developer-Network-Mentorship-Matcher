import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { getDb } from '../db/client.js';
import { encryptToken } from '../services/crypto.service.js';
import { SyncWorkerQueue } from '../services/sync.worker.js';
import { UserSession } from '../types/index.js';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/auth/github
   * Generates CSRF state and redirects user to GitHub OAuth authorize screen.
   * Spec Section 7
   */
  fastify.get('/api/v1/auth/github', async (_request: FastifyRequest, reply: FastifyReply) => {
    const csrfState = crypto.randomBytes(16).toString('hex');

    reply.setCookie('oauth_csrf_state', csrfState, {
      path: '/',
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: ENV.GH_CLIENT_ID,
      redirect_uri: `${ENV.FRONTEND_URL}/api/v1/auth/github/callback`,
      scope: 'read:user,user:email,public_repo',
      state: csrfState,
    });

    const redirectUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return reply.redirect(redirectUrl);
  });

  /**
   * GET /api/v1/auth/github/callback
   * Exchanges temporary authorization code, provisions session JWT cookie (Spec Section 3)
   */
  fastify.get('/api/v1/auth/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code, state } = request.query as { code?: string; state?: string };
    const storedState = request.cookies.oauth_csrf_state;

    if (!code || !state || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid CSRF state or missing authorization code' });
    }

    try {
      // 1. Exchange code for access token
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          client_id: ENV.GH_CLIENT_ID,
          client_secret: ENV.GH_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokenData.access_token) {
        throw new Error(tokenData.error || 'Failed to exchange authorization code for token');
      }

      const accessToken = tokenData.access_token;

      // 2. Fetch authenticated user profile
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mentorship-Matcher/1.0',
        },
      });

      const ghUser = (await userRes.json()) as {
        id: number;
        login: string;
        avatar_url: string;
        bio: string | null;
      };

      // 3. Encrypt access token at rest with AES-256-GCM
      const encrypted = encryptToken(accessToken);
      const db = await getDb();

      // Upsert into users table
      const upsertUser = await db.query<{ id: string; role: string }>(
        `INSERT INTO users (github_id, handle, avatar_url, bio, encrypted_token, token_iv, token_tag, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (github_id)
         DO UPDATE SET 
           handle = EXCLUDED.handle,
           avatar_url = EXCLUDED.avatar_url,
           bio = EXCLUDED.bio,
           encrypted_token = EXCLUDED.encrypted_token,
           token_iv = EXCLUDED.token_iv,
           token_tag = EXCLUDED.token_tag,
           updated_at = NOW()
         RETURNING id, role`,
        [ghUser.id, ghUser.login, ghUser.avatar_url, ghUser.bio || '', encrypted.encryptedText, encrypted.iv, encrypted.tag]
      );

      const userId = upsertUser.rows[0].id;
      const role = (upsertUser.rows[0].role || 'mentee') as UserSession['role'];

      // Ensure profile entry exists
      await db.query(
        `INSERT INTO profiles (user_id, updated_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // Trigger initial background crawl pipeline
      SyncWorkerQueue.getInstance().enqueue(userId, ghUser.login);

      // 4. Provision signed stateless JWT session cookie
      const sessionPayload: UserSession = {
        id: userId,
        githubId: ghUser.id,
        handle: ghUser.login,
        role,
        avatarUrl: ghUser.avatar_url,
        bio: ghUser.bio || '',
      };

      const sessionToken = jwt.sign(sessionPayload, ENV.JWT_SECRET, { expiresIn: '7d' });

      reply.setCookie('session_token', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });

      reply.clearCookie('oauth_csrf_state');
      return reply.redirect('/');
    } catch (err) {
      console.error('OAuth callback error:', err);
      return reply.status(500).send({ error: 'GitHub authentication failed', message: (err as Error).message });
    }
  });

  /**
   * POST /api/v1/auth/demo-login
   * Allows instant persona switching for testing, demonstrations, and interviews without GitHub OAuth keys.
   */
  fastify.post('/api/v1/auth/demo-login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { handle, role } = (request.body as { handle?: string; role?: string }) || {};
    const db = await getDb();

    let query = 'SELECT id, github_id, handle, role, avatar_url, bio FROM users';
    const params: any[] = [];

    if (handle) {
      query += ' WHERE handle = $1';
      params.push(handle);
    } else if (role) {
      query += ' WHERE role = $1';
      params.push(role);
    } else {
      // Default to junior mentee Alex Chen
      query += " WHERE handle = 'alexchen-dev'";
    }

    query += ' LIMIT 1';

    const userRes = await db.query<any>(query, params);
    if (userRes.rows.length === 0) {
      return reply.status(404).send({ error: 'User persona not found. Make sure to run `npm run seed` first.' });
    }

    const u = userRes.rows[0];
    const sessionPayload: UserSession = {
      id: u.id,
      githubId: Number(u.github_id),
      handle: u.handle,
      role: u.role,
      avatarUrl: u.avatar_url,
      bio: u.bio,
    };

    const sessionToken = jwt.sign(sessionPayload, ENV.JWT_SECRET, { expiresIn: '7d' });

    reply.setCookie('session_token', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: ENV.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
    });

    return reply.send({
      user: sessionPayload,
      token: sessionToken,
    });
  });

  /**
   * GET /api/v1/auth/me
   * Returns current authenticated user and profile signals.
   */
  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const db = await getDb();

      const profileRes = await db.query(
        `SELECT languages, topics, commit_activity, repo_count, synced_at 
         FROM profiles WHERE user_id = $1`,
        [user.id]
      );

      const profile = profileRes.rows[0] || {
        languages: {},
        topics: [],
        commit_activity: 0,
        repo_count: 0,
        synced_at: null,
      };

      if (typeof profile.languages === 'string') {
        profile.languages = JSON.parse(profile.languages);
      }

      return reply.send({
        user,
        profile,
      });
    }
  );

  /**
   * POST /api/v1/auth/role
   * Updates user role ('mentor' | 'mentee' | 'both') and updates session cookie.
   */
  fastify.post(
    '/api/v1/auth/role',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { role } = request.body as { role: 'mentor' | 'mentee' | 'both' };
      if (!['mentor', 'mentee', 'both'].includes(role)) {
        return reply.status(400).send({ error: 'Invalid role. Must be mentor, mentee, or both.' });
      }

      const db = await getDb();
      await db.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2', [role, request.user!.id]);

      // Trigger match recomputation
      await SyncWorkerQueue.getInstance().recomputeMatchesForUser(request.user!.id, role);

      const updatedUser: UserSession = {
        ...request.user!,
        role,
      };

      const sessionToken = jwt.sign(updatedUser, ENV.JWT_SECRET, { expiresIn: '7d' });
      reply.setCookie('session_token', sessionToken, {
        path: '/',
        httpOnly: true,
        secure: ENV.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });

      return reply.send({ user: updatedUser });
    }
  );

  /**
   * POST /api/v1/auth/logout
   */
  fastify.post('/api/v1/auth/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('session_token', { path: '/' });
    return reply.send({ success: true, message: 'Logged out successfully' });
  });

  /**
   * GET /api/v1/auth/personas
   * Public list of available sample personas for quick switching in the UI
   */
  fastify.get('/api/v1/auth/personas', async (_request: FastifyRequest, reply: FastifyReply) => {
    const db = await getDb();
    const personasRes = await db.query(
      `SELECT u.id, u.handle, u.role, u.avatar_url, u.bio, p.languages, p.topics, p.commit_activity
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       ORDER BY u.role, u.handle`
    );

    const personas = personasRes.rows.map(row => ({
      ...row,
      languages: typeof row.languages === 'string' ? JSON.parse(row.languages) : row.languages,
    }));

    return reply.send({ personas });
  });
}
