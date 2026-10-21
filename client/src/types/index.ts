export interface User {
  id: string;
  githubId: number;
  handle: string;
  role: 'mentor' | 'mentee' | 'both' | 'undecided';
  avatarUrl?: string;
  bio?: string;
}

export interface Profile {
  languages: Record<string, number>;
  topics: string[];
  commit_activity: number;
  repo_count: number;
  synced_at: string | null;
}

export interface MatchBreakdown {
  sLang: number;
  sTopic: number;
  sActivity: number;
  compositeScore: number;
  weights: {
    lang: number;
    topic: number;
    activity: number;
  };
  languageDetails: {
    sharedLanguages: {
      name: string;
      juniorBytes: number;
      mentorBytes: number;
      juniorPct: number;
      mentorPct: number;
    }[];
    juniorExclusive: string[];
    mentorExclusive: string[];
    cosineSimilarity: number;
  };
  topicDetails: {
    intersection: string[];
    union: string[];
    juniorOnly: string[];
    mentorOnly: string[];
    jaccardIndex: number;
  };
  activityDetails: {
    mentorCommits90d: number;
    targetBenchmark: number;
    activityScore: number;
  };
  meetsThreshold: boolean;
}

export interface Mentor {
  id: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  languages: Record<string, number>;
  topics: string[];
  commitActivity: number;
  repoCount: number;
}

export interface Match {
  id: string;
  score: number;
  status: 'suggested' | 'requested' | 'accepted';
  updatedAt: string;
  breakdown: MatchBreakdown;
  mentor: Mentor;
}

export interface Persona {
  id: string;
  handle: string;
  role: 'mentor' | 'mentee' | 'both';
  avatar_url?: string;
  bio?: string;
  languages: Record<string, number>;
  topics: string[];
  commit_activity: number;
}

export interface SyncStatus {
  userJob: {
    userId: string;
    handle?: string;
    status: 'idle' | 'queued' | 'in_progress' | 'completed' | 'failed';
    details?: {
      repoCount: number;
      languagesFound: number;
      topicsCount: number;
      matchesCalculated: number;
    };
  };
  queueStats: {
    pendingJobs: number;
    isProcessing: boolean;
    completedToday: number;
  };
}
