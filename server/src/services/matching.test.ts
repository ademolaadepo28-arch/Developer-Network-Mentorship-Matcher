import { describe, it, expect } from 'vitest';
import {
  calculateLanguageAffinity,
  calculateTopicAffinity,
  calculateActivityDampener,
  computeMatchScore,
  DeveloperProfile
} from './matching.service.js';

describe('Match-Scoring Algorithm Implementation (Spec Section 6)', () => {
  describe('calculateLanguageAffinity (Cosine Similarity Slang)', () => {
    it('returns 1.0 for identical language byte vectors', () => {
      const junior = { TypeScript: 500000, Rust: 250000 };
      const mentor = { TypeScript: 1000000, Rust: 500000 };
      const res = calculateLanguageAffinity(junior, mentor);
      expect(res.score).toBeCloseTo(1.0, 3);
      expect(res.shared).toHaveLength(2);
    });

    it('returns 0.0 for completely disjoint language footprints', () => {
      const junior = { TypeScript: 400000 };
      const mentor = { Go: 800000 };
      const res = calculateLanguageAffinity(junior, mentor);
      expect(res.score).toBe(0);
      expect(res.shared).toHaveLength(0);
      expect(res.juniorOnly).toContain('TypeScript');
      expect(res.mentorOnly).toContain('Go');
    });

    it('calculates correct cosine similarity for partial overlap', () => {
      // Junior: 3/5 TS, 4/5 Python => norm vector [3/7, 4/7]
      // Let's test with known values:
      // J = [1, 1], M = [1, 0]
      // dot = 1, |J| = sqrt(2), |M| = 1 => 1 / sqrt(2) = 0.7071
      const junior = { TypeScript: 50000, Python: 50000 }; // 50% TS, 50% Python
      const mentor = { TypeScript: 100000 };               // 100% TS
      const res = calculateLanguageAffinity(junior, mentor);
      // Normalized J: [0.5, 0.5], M: [1.0, 0]
      // dot: 0.5, |J|: sqrt(0.25+0.25)=sqrt(0.5)=0.7071, |M|: 1 => 0.5 / 0.7071 = 0.7071
      expect(res.score).toBeCloseTo(0.7071, 3);
    });
  });

  describe('calculateTopicAffinity (Jaccard Index Stopic)', () => {
    it('returns 1.0 for identical topic sets regardless of order and casing', () => {
      const junior = ['react', 'web-development', 'typescript'];
      const mentor = ['TypeScript', 'React', 'web-development'];
      const res = calculateTopicAffinity(junior, mentor);
      expect(res.score).toBe(1.0);
      expect(res.intersection).toHaveLength(3);
    });

    it('returns 0.0 for disjoint topic sets', () => {
      const junior = ['react', 'frontend'];
      const mentor = ['kubernetes', 'distributed-systems'];
      const res = calculateTopicAffinity(junior, mentor);
      expect(res.score).toBe(0);
      expect(res.intersection).toHaveLength(0);
      expect(res.union).toHaveLength(4);
    });

    it('calculates |intersection| / |union| correctly for partial overlap', () => {
      // Junior: [fastify, node, postgresql] (3 items)
      // Mentor: [fastify, postgresql, docker, aws] (4 items)
      // Intersection: [fastify, postgresql] (2 items)
      // Union: [fastify, node, postgresql, docker, aws] (5 items)
      // Jaccard: 2 / 5 = 0.4000
      const junior = ['fastify', 'node', 'postgresql'];
      const mentor = ['fastify', 'postgresql', 'docker', 'aws'];
      const res = calculateTopicAffinity(junior, mentor);
      expect(res.score).toBeCloseTo(0.4, 3);
      expect(res.intersection).toHaveLength(2);
      expect(res.union).toHaveLength(5);
    });
  });

  describe('calculateActivityDampener (Sactivity)', () => {
    it('returns 1.0 when mentor active commits >= 45 in rolling 90 days', () => {
      expect(calculateActivityDampener(45).score).toBe(1.0);
      expect(calculateActivityDampener(120).score).toBe(1.0);
    });

    it('scales linearly below 45 commits', () => {
      expect(calculateActivityDampener(0).score).toBe(0.0);
      // 22.5 / 45 = 0.5
      expect(calculateActivityDampener(22.5).score).toBe(0.5);
    });
  });

  describe('computeMatchScore (Weighted Composite Affinity Formulation)', () => {
    it('produces 1.000 for perfect alignment and qualifies above 0.65 threshold', () => {
      const junior: DeveloperProfile = {
        userId: 'j1',
        languages: { TypeScript: 100000, Rust: 50000 },
        topics: ['distributed-systems', 'async', 'networking'],
        commitActivity: 20,
      };
      const mentor: DeveloperProfile = {
        userId: 'm1',
        languages: { TypeScript: 200000, Rust: 100000 },
        topics: ['distributed-systems', 'async', 'networking'],
        commitActivity: 60,
      };

      const result = computeMatchScore(junior, mentor);
      expect(result.score).toBe(1.0);
      expect(result.breakdown.meetsThreshold).toBe(true);
      expect(result.breakdown.sLang).toBeCloseTo(1.0);
      expect(result.breakdown.sTopic).toBeCloseTo(1.0);
      expect(result.breakdown.sActivity).toBe(1.0);
    });

    it('correctly weighs 55% Lang + 30% Topic + 15% Activity', () => {
      const junior: DeveloperProfile = {
        userId: 'j1',
        languages: { Go: 100000 },
        topics: ['docker', 'kubernetes'],
        commitActivity: 10,
      };
      const mentor: DeveloperProfile = {
        userId: 'm1',
        languages: { Go: 500000 }, // Slang = 1.0
        topics: ['kubernetes', 'cloud'], // Stopic = 1 / 3 = 0.3333
        commitActivity: 45, // Sactivity = 1.0
      };

      // Score = 0.55*(1.0) + 0.30*(0.3333) + 0.15*(1.0) = 0.55 + 0.10 + 0.15 = 0.800
      const result = computeMatchScore(junior, mentor);
      expect(result.score).toBeCloseTo(0.80, 2);
      expect(result.breakdown.meetsThreshold).toBe(true);
    });

    it('flags matches below 0.65 threshold as false', () => {
      const junior: DeveloperProfile = {
        userId: 'j1',
        languages: { Python: 100000 },
        topics: ['machine-learning', 'pytorch'],
        commitActivity: 5,
      };
      const mentor: DeveloperProfile = {
        userId: 'm1',
        languages: { Swift: 500000 }, // Slang = 0
        topics: ['ios', 'swiftui'], // Stopic = 0
        commitActivity: 10, // Sactivity = 10/45 = 0.222
      };

      const result = computeMatchScore(junior, mentor);
      expect(result.score).toBeLessThan(0.65);
      expect(result.breakdown.meetsThreshold).toBe(false);
    });
  });
});
