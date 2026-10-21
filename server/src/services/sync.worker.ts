import { getDb } from '../db/client.js';
import { GitHubService } from './github.service.js';
import { decryptToken } from './crypto.service.js';
import { computeMatchScore, DeveloperProfile } from './matching.service.js';
import { ENV } from '../config/env.js';

export interface SyncJob {
  userId: string;
  handle: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  enqueuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  details?: {
    repoCount: number;
    languagesFound: number;
    topicsCount: number;
    matchesCalculated: number;
  };
}

export class SyncWorkerQueue {
  private static instance: SyncWorkerQueue;
  private queue: SyncJob[] = [];
  private isProcessing = false;
  private jobHistory: Map<string, SyncJob> = new Map();
  private intervalTimer: NodeJS.Timeout | null = null;

  public static getInstance(): SyncWorkerQueue {
    if (!SyncWorkerQueue.instance) {
      SyncWorkerQueue.instance = new SyncWorkerQueue();
    }
    return SyncWorkerQueue.instance;
  }

  constructor() {
    this.startPeriodicSync();
  }

  /**
   * Enqueues background crawl of authenticated developer's GitHub repositories.
   * Spec Section 7: POST /api/v1/sync
   */
  public enqueue(userId: string, handle: string): SyncJob {
    const existing = this.queue.find(j => j.userId === userId);
    if (existing) {
      return existing;
    }

    const job: SyncJob = {
      userId,
      handle,
      status: 'queued',
      enqueuedAt: new Date(),
    };

    this.queue.push(job);
    this.jobHistory.set(userId, job);
    
    // Asynchronously trigger queue processing
    setImmediate(() => this.processNext());

    return job;
  }

  public getStatus(userId: string): SyncJob | undefined {
    return this.jobHistory.get(userId);
  }

  public getQueueStats() {
    return {
      pendingJobs: this.queue.length,
      isProcessing: this.isProcessing,
      completedToday: Array.from(this.jobHistory.values()).filter(j => j.status === 'completed').length,
    };
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue.shift()!;
    job.status = 'in_progress';
    job.startedAt = new Date();

    try {
      console.log(`[SyncWorker] Starting GitHub crawl for user: ${job.handle} (${job.userId})`);
      const db = await getDb();

      // Retrieve user and token
      const userRes = await db.query<{
        encrypted_token: string;
        token_iv: string;
        token_tag: string;
        role: string;
      }>('SELECT encrypted_token, token_iv, token_tag, role FROM users WHERE id = $1', [job.userId]);

      if (userRes.rows.length === 0) {
        throw new Error(`User not found: ${job.userId}`);
      }

      const user = userRes.rows[0];
      let plainToken = '';

      if (user.encrypted_token && user.token_iv && user.token_tag) {
        try {
          plainToken = decryptToken(user.encrypted_token, user.token_iv, user.token_tag);
        } catch (err) {
          console.warn('[SyncWorker] Could not decrypt token, using fallback:', (err as Error).message);
        }
      }

      // Step A & Step B: Ingest GitHub metadata with conditional ETag caching
      const githubService = GitHubService.getInstance();
      const ingested = await githubService.syncUserGitHubProfile(job.userId, job.handle, plainToken);

      // Upsert profile in DB
      await db.query(
        `INSERT INTO profiles (user_id, languages, topics, commit_activity, repo_count, synced_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET 
           languages = EXCLUDED.languages,
           topics = EXCLUDED.topics,
           commit_activity = EXCLUDED.commit_activity,
           repo_count = EXCLUDED.repo_count,
           synced_at = NOW(),
           updated_at = NOW()`,
        [
          job.userId,
          JSON.stringify(ingested.languages),
          ingested.topics,
          ingested.commitActivity,
          ingested.repoCount,
        ]
      );

      // Recompute matches based on the user's role
      const matchesCalculated = await this.recomputeMatchesForUser(job.userId, user.role);

      job.status = 'completed';
      job.completedAt = new Date();
      job.details = {
        repoCount: ingested.repoCount,
        languagesFound: Object.keys(ingested.languages).length,
        topicsCount: ingested.topics.length,
        matchesCalculated,
      };

      console.log(`[SyncWorker] Completed crawl for ${job.handle}. Repos: ${ingested.repoCount}, Matches evaluated: ${matchesCalculated}`);
    } catch (err) {
      console.error(`[SyncWorker] Sync failed for ${job.handle}:`, err);
      job.status = 'failed';
      job.error = (err as Error).message;
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }

  /**
   * Recomputes affinity scores for the updated user against counter-parties.
   */
  public async recomputeMatchesForUser(userId: string, role: string): Promise<number> {
    const db = await getDb();

    // Fetch this user's profile
    const myProfileRes = await db.query<{
      user_id: string;
      languages: any;
      topics: string[];
      commit_activity: number;
    }>('SELECT user_id, languages, topics, commit_activity FROM profiles WHERE user_id = $1', [userId]);

    if (myProfileRes.rows.length === 0) return 0;
    const myProfile = myProfileRes.rows[0];

    let matchCount = 0;

    if (role === 'mentee' || role === 'both' || role === 'undecided') {
      // Recompute against all mentors
      const mentorsRes = await db.query<{
        user_id: string;
        languages: any;
        topics: string[];
        commit_activity: number;
      }>(
        `SELECT p.user_id, p.languages, p.topics, p.commit_activity 
         FROM profiles p 
         JOIN users u ON u.id = p.user_id 
         WHERE u.role IN ('mentor', 'both') AND u.id != $1`,
        [userId]
      );

      const juniorDevProfile: DeveloperProfile = {
        userId,
        languages: typeof myProfile.languages === 'string' ? JSON.parse(myProfile.languages) : myProfile.languages,
        topics: myProfile.topics || [],
        commitActivity: myProfile.commit_activity,
      };

      for (const mentor of mentorsRes.rows) {
        const mentorDevProfile: DeveloperProfile = {
          userId: mentor.user_id,
          languages: typeof mentor.languages === 'string' ? JSON.parse(mentor.languages) : mentor.languages,
          topics: mentor.topics || [],
          commitActivity: mentor.commit_activity,
        };

        const { score, breakdown } = computeMatchScore(juniorDevProfile, mentorDevProfile);

        await db.query(
          `INSERT INTO matches (junior_id, mentor_id, score, status, breakdown, updated_at)
           VALUES ($1, $2, $3, 'suggested', $4, NOW())
           ON CONFLICT (junior_id, mentor_id)
           DO UPDATE SET score = EXCLUDED.score, breakdown = EXCLUDED.breakdown, updated_at = NOW()
           WHERE matches.status = 'suggested'`,
          [userId, mentor.user_id, score, JSON.stringify(breakdown)]
        );
        matchCount++;
      }
    }

    if (role === 'mentor' || role === 'both') {
      // Recompute against all mentees
      const menteesRes = await db.query<{
        user_id: string;
        languages: any;
        topics: string[];
        commit_activity: number;
      }>(
        `SELECT p.user_id, p.languages, p.topics, p.commit_activity 
         FROM profiles p 
         JOIN users u ON u.id = p.user_id 
         WHERE u.role IN ('mentee', 'both', 'undecided') AND u.id != $1`,
        [userId]
      );

      const mentorDevProfile: DeveloperProfile = {
        userId,
        languages: typeof myProfile.languages === 'string' ? JSON.parse(myProfile.languages) : myProfile.languages,
        topics: myProfile.topics || [],
        commitActivity: myProfile.commit_activity,
      };

      for (const mentee of menteesRes.rows) {
        const juniorDevProfile: DeveloperProfile = {
          userId: mentee.user_id,
          languages: typeof mentee.languages === 'string' ? JSON.parse(mentee.languages) : mentee.languages,
          topics: mentee.topics || [],
          commitActivity: mentee.commit_activity,
        };

        const { score, breakdown } = computeMatchScore(juniorDevProfile, mentorDevProfile);

        await db.query(
          `INSERT INTO matches (junior_id, mentor_id, score, status, breakdown, updated_at)
           VALUES ($1, $2, $3, 'suggested', $4, NOW())
           ON CONFLICT (junior_id, mentor_id)
           DO UPDATE SET score = EXCLUDED.score, breakdown = EXCLUDED.breakdown, updated_at = NOW()
           WHERE matches.status = 'suggested'`,
          [mentee.user_id, userId, score, JSON.stringify(breakdown)]
        );
        matchCount++;
      }
    }

    return matchCount;
  }

  /**
   * Periodic 12-hour sync trigger as specified in Architecture Spec Section 5.
   */
  private startPeriodicSync(): void {
    const twelveHoursMs = ENV.SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
    this.intervalTimer = setInterval(async () => {
      try {
        console.log('[SyncWorker] Running scheduled 12-hour synchronization cycle...');
        const db = await getDb();
        const users = await db.query<{ id: string; handle: string }>(
          'SELECT id, handle FROM users WHERE encrypted_token IS NOT NULL'
        );
        for (const user of users.rows) {
          this.enqueue(user.id, user.handle);
        }
      } catch (err) {
        console.error('[SyncWorker] Error during scheduled sync trigger:', err);
      }
    }, twelveHoursMs);
    // Unref timer so it doesn't prevent graceful process exit
    if (this.intervalTimer.unref) {
      this.intervalTimer.unref();
    }
  }
}
