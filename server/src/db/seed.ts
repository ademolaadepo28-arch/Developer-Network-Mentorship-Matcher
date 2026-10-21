import { getDb, initDb } from './client.js';
import { encryptToken } from '../services/crypto.service.js';
import { computeMatchScore, DeveloperProfile } from '../services/matching.service.js';

export async function seedDatabase(): Promise<void> {
  console.log('--- Starting Database Seeding ---');
  await initDb();
  const db = await getDb();

  // Clear existing mock data if any
  await db.query('DELETE FROM matches');
  await db.query('DELETE FROM sync_etags');
  await db.query('DELETE FROM profiles');
  await db.query('DELETE FROM users');

  const usersToInsert: Array<{
    github_id: number;
    handle: string;
    role: string;
    avatar_url: string;
    bio: string;
    token: string;
    languages: Record<string, number>;
    topics: string[];
    commit_activity: number;
    repo_count: number;
  }> = [
    // --- JUNIOR MENTEES ---
    {
      github_id: 10001,
      handle: 'alexchen-dev',
      role: 'mentee',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=250&auto=format&fit=crop&q=80',
      bio: 'Junior Frontend Developer leveling up to Full-Stack. Building with React, TypeScript, and modern Node.',
      token: 'mock_token_alexchen_2026',
      languages: {
        TypeScript: 480000,
        JavaScript: 160000,
        HTML: 70000,
        CSS: 90000,
      },
      topics: ['react', 'typescript', 'frontend', 'tailwind', 'vite', 'web-development'],
      commit_activity: 32,
      repo_count: 8,
    },
    {
      github_id: 10002,
      handle: 'mayapatel-ai',
      role: 'mentee',
      avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=250&auto=format&fit=crop&q=80',
      bio: 'Junior ML Engineer exploring PyTorch, FastAPI, and data engineering pipelines.',
      token: 'mock_token_mayapatel_2026',
      languages: {
        Python: 540000,
        SQL: 110000,
        Shell: 40000,
      },
      topics: ['python', 'fastapi', 'data-science', 'machine-learning', 'pandas', 'pytorch'],
      commit_activity: 38,
      repo_count: 6,
    },
    {
      github_id: 10003,
      handle: 'liam-systems',
      role: 'mentee',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=250&auto=format&fit=crop&q=80',
      bio: 'Systems enthusiast transitioning into Rust and distributed architectures. Passionate about networking.',
      token: 'mock_token_liam_2026',
      languages: {
        Rust: 360000,
        C: 210000,
        Go: 85000,
      },
      topics: ['rust', 'systems-programming', 'concurrency', 'linux', 'networking'],
      commit_activity: 42,
      repo_count: 11,
    },

    // --- SENIOR MENTORS ---
    {
      github_id: 20001,
      handle: 'marcusvance-eng',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=250&auto=format&fit=crop&q=80',
      bio: 'Staff Full-Stack Architect. Fastify & React open source maintainer. Coached 20+ engineers from junior to staff.',
      token: 'mock_token_marcusvance_2026',
      languages: {
        TypeScript: 920000,
        JavaScript: 140000,
        SQL: 180000,
      },
      topics: ['react', 'typescript', 'fastify', 'node', 'postgresql', 'web-development', 'architecture'],
      commit_activity: 82,
      repo_count: 24,
    },
    {
      github_id: 20002,
      handle: 'elena-techlead',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=250&auto=format&fit=crop&q=80',
      bio: 'Principal Distributed Systems Engineer & Rust Foundation member. High-throughput distributed storage engines.',
      token: 'mock_token_elena_2026',
      languages: {
        Rust: 960000,
        Go: 320000,
        C: 150000,
      },
      topics: ['rust', 'distributed-systems', 'concurrency', 'raft', 'networking', 'linux', 'performance'],
      commit_activity: 74,
      repo_count: 31,
    },
    {
      github_id: 20003,
      handle: 'sarahlin-ml',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=250&auto=format&fit=crop&q=80',
      bio: 'Head of Applied AI & MLOps. PyTorch core contributor. Specializing in scalable model serving and data platforms.',
      token: 'mock_token_sarahlin_2026',
      languages: {
        Python: 1250000,
        Rust: 180000,
        SQL: 190000,
        Shell: 75000,
      },
      topics: ['python', 'pytorch', 'machine-learning', 'fastapi', 'kubernetes', 'mlops', 'llm'],
      commit_activity: 64,
      repo_count: 28,
    },
    {
      github_id: 20004,
      handle: 'devon-cloud',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=250&auto=format&fit=crop&q=80',
      bio: 'Senior Cloud & Infrastructure SRE. Kubernetes organizer. Passionate about CI/CD, Go microservices, and observability.',
      token: 'mock_token_devon_2026',
      languages: {
        Go: 850000,
        Python: 240000,
        Shell: 160000,
      },
      topics: ['kubernetes', 'go', 'docker', 'cloud-native', 'terraform', 'aws', 'ci-cd'],
      commit_activity: 52,
      repo_count: 19,
    },
    {
      github_id: 20005,
      handle: 'kavita-mobile',
      role: 'mentor',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=250&auto=format&fit=crop&q=80',
      bio: 'Staff Mobile Engineer. Specializing in iOS, Swift modern concurrency, and cross-platform native SDK architecture.',
      token: 'mock_token_kavita_2026',
      languages: {
        Swift: 680000,
        Kotlin: 420000,
        TypeScript: 110000,
      },
      topics: ['ios', 'swiftui', 'android', 'mobile', 'swift', 'performance'],
      commit_activity: 46,
      repo_count: 17,
    },
  ];

  const insertedUserIds: { id: string; handle: string; role: string; profile: DeveloperProfile }[] = [];

  for (const u of usersToInsert) {
    const enc = encryptToken(u.token);
    const userRes = await db.query<{ id: string }>(
      `INSERT INTO users (github_id, handle, role, avatar_url, bio, encrypted_token, token_iv, token_tag, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING id`,
      [u.github_id, u.handle, u.role, u.avatar_url, u.bio, enc.encryptedText, enc.iv, enc.tag]
    );

    const userId = userRes.rows[0].id;

    await db.query(
      `INSERT INTO profiles (user_id, languages, topics, commit_activity, repo_count, synced_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [userId, JSON.stringify(u.languages), u.topics, u.commit_activity, u.repo_count]
    );

    insertedUserIds.push({
      id: userId,
      handle: u.handle,
      role: u.role,
      profile: {
        userId,
        languages: u.languages,
        topics: u.topics,
        commitActivity: u.commit_activity,
      },
    });
  }

  console.log(`Inserted ${insertedUserIds.length} users and developer profiles.`);

  // Now compute all pairings between mentees and mentors
  const mentees = insertedUserIds.filter(u => u.role === 'mentee');
  const mentors = insertedUserIds.filter(u => u.role === 'mentor');

  let matchInsertCount = 0;
  for (const mentee of mentees) {
    for (const mentor of mentors) {
      const { score, breakdown } = computeMatchScore(mentee.profile, mentor.profile);

      // Pre-set one of the high matches to 'requested' or 'accepted' to show varied realistic states in the UI
      let status = 'suggested';
      if (mentee.handle === 'alexchen-dev' && mentor.handle === 'marcusvance-eng') {
        status = 'requested'; // Demo the optimistic requested state!
      } else if (mentee.handle === 'liam-systems' && mentor.handle === 'elena-techlead') {
        status = 'accepted'; // Demo the accepted connected state!
      }

      await db.query(
        `INSERT INTO matches (junior_id, mentor_id, score, status, breakdown, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [mentee.id, mentor.id, score, status, JSON.stringify(breakdown)]
      );
      matchInsertCount++;
    }
  }

  console.log(`Computed and stored ${matchInsertCount} match records with full math breakdown.`);
  console.log('--- Database Seeding Complete ---');
}

// Allow direct execution
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
