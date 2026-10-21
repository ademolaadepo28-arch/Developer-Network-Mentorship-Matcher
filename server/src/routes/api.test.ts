import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../server.js';
import { FastifyInstance } from 'fastify';
import { seedDatabase } from '../db/seed.js';

describe('Fastify REST Contract Endpoints (Spec Section 7)', () => {
  let app: FastifyInstance;
  let menteeToken: string;
  let menteeId: string;
  let sampleMatchId: string;

  beforeAll(async () => {
    await seedDatabase();
    app = await buildServer();
    await app.ready();

    // Perform demo login for junior mentee Alex Chen
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/demo-login',
      payload: { handle: 'alexchen-dev' },
    });

    expect(loginRes.statusCode).toBe(200);
    const body = JSON.parse(loginRes.body);
    menteeToken = body.token;
    menteeId = body.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200 OK', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toContain('Developer Network & Mentorship Matcher');
  });

  it('GET /api/v1/auth/me returns mentee profile and session data', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${menteeToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.user.handle).toBe('alexchen-dev');
    expect(body.user.role).toBe('mentee');
    expect(body.profile.languages.TypeScript).toBeGreaterThan(0);
  });

  it('GET /api/v1/matches/feed returns ranked mentors exceeding 0.65 threshold', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/matches/feed',
      headers: {
        authorization: `Bearer ${menteeToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.matches).toBeInstanceOf(Array);
    expect(body.matches.length).toBeGreaterThan(0);

    // Verify all returned matches exceed affinity threshold of 0.65 (Spec Section 6)
    for (const match of body.matches) {
      expect(match.score).toBeGreaterThanOrEqual(0.65);
      expect(match.breakdown).toBeDefined();
      expect(match.breakdown.weights.lang).toBe(0.55);
      expect(match.breakdown.weights.topic).toBe(0.30);
      expect(match.breakdown.weights.activity).toBe(0.15);
    }

    // Verify sorted in descending order by score
    for (let i = 1; i < body.matches.length; i++) {
      expect(body.matches[i - 1].score).toBeGreaterThanOrEqual(body.matches[i].score);
    }

    sampleMatchId = body.matches[0].id;
  });

  it('POST /api/v1/matches/:id/request transitions record status to requested', async () => {
    expect(sampleMatchId).toBeDefined();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/matches/${sampleMatchId}/request`,
      headers: {
        authorization: `Bearer ${menteeToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.status).toBe('requested');
  });

  it('GET /api/v1/matches/:id/breakdown provides mathematical derivation', async () => {
    expect(sampleMatchId).toBeDefined();

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/matches/${sampleMatchId}/breakdown`,
      headers: {
        authorization: `Bearer ${menteeToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.score).toBeGreaterThan(0);
    expect(body.breakdown.sLang).toBeDefined();
    expect(body.breakdown.sTopic).toBeDefined();
    expect(body.breakdown.sActivity).toBeDefined();
    expect(body.breakdown.languageDetails.sharedLanguages).toBeInstanceOf(Array);
  });

  it('POST /api/v1/sync enqueues background repository crawl', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sync',
      headers: {
        authorization: `Bearer ${menteeToken}`,
      },
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('enqueued');
    expect(body.job.status).toBe('queued');
  });
});
