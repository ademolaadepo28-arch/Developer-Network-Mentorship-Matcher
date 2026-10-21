import { ENV } from '../config/env.js';

export interface DeveloperProfile {
  userId: string;
  languages: Record<string, number>; // language -> byte count
  topics: string[];
  commitActivity: number; // rolling 90-day pushed commits
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

/**
 * Calculates Cosine Similarity between normalized language byte vectors of junior user J and mentor M.
 * Slang = (∑ Ji × Mi) / (√(∑ Ji^2) × √(∑ Mi^2))
 */
export function calculateLanguageAffinity(
  juniorLanguages: Record<string, number>,
  mentorLanguages: Record<string, number>
): {
  score: number;
  shared: { name: string; juniorBytes: number; mentorBytes: number; juniorPct: number; mentorPct: number }[];
  juniorOnly: string[];
  mentorOnly: string[];
} {
  const juniorTotal = Object.values(juniorLanguages).reduce((a, b) => a + b, 0);
  const mentorTotal = Object.values(mentorLanguages).reduce((a, b) => a + b, 0);

  if (juniorTotal === 0 || mentorTotal === 0) {
    return { score: 0, shared: [], juniorOnly: Object.keys(juniorLanguages), mentorOnly: Object.keys(mentorLanguages) };
  }

  // Normalized byte vectors
  const jNorm: Record<string, number> = {};
  for (const [lang, bytes] of Object.entries(juniorLanguages)) {
    jNorm[lang] = bytes / juniorTotal;
  }

  const mNorm: Record<string, number> = {};
  for (const [lang, bytes] of Object.entries(mentorLanguages)) {
    mNorm[lang] = bytes / mentorTotal;
  }

  const allLanguages = Array.from(new Set([...Object.keys(juniorLanguages), ...Object.keys(mentorLanguages)]));
  
  let dotProduct = 0;
  let jMagnitudeSq = 0;
  let mMagnitudeSq = 0;

  const shared: { name: string; juniorBytes: number; mentorBytes: number; juniorPct: number; mentorPct: number }[] = [];
  const juniorOnly: string[] = [];
  const mentorOnly: string[] = [];

  for (const lang of allLanguages) {
    const jVal = jNorm[lang] || 0;
    const mVal = mNorm[lang] || 0;

    dotProduct += jVal * mVal;
    jMagnitudeSq += jVal * jVal;
    mMagnitudeSq += mVal * mVal;

    if (jVal > 0 && mVal > 0) {
      shared.push({
        name: lang,
        juniorBytes: juniorLanguages[lang] || 0,
        mentorBytes: mentorLanguages[lang] || 0,
        juniorPct: Math.round(jVal * 100),
        mentorPct: Math.round(mVal * 100),
      });
    } else if (jVal > 0) {
      juniorOnly.push(lang);
    } else {
      mentorOnly.push(lang);
    }
  }

  const denominator = Math.sqrt(jMagnitudeSq) * Math.sqrt(mMagnitudeSq);
  const score = denominator > 0 ? Math.min(1.0, dotProduct / denominator) : 0;

  return {
    score: Number(score.toFixed(4)),
    shared: shared.sort((a, b) => (b.juniorPct + b.mentorPct) - (a.juniorPct + a.mentorPct)),
    juniorOnly,
    mentorOnly,
  };
}

/**
 * Calculates Jaccard intersection over union index of repository topic sets.
 * Stopic = |TopicsJ ∩ TopicsM| / |TopicsJ ∪ TopicsM|
 */
export function calculateTopicAffinity(
  juniorTopics: string[],
  mentorTopics: string[]
): {
  score: number;
  intersection: string[];
  union: string[];
  juniorOnly: string[];
  mentorOnly: string[];
} {
  const jSet = new Set(juniorTopics.map(t => t.toLowerCase().trim()).filter(Boolean));
  const mSet = new Set(mentorTopics.map(t => t.toLowerCase().trim()).filter(Boolean));

  if (jSet.size === 0 && mSet.size === 0) {
    return { score: 0, intersection: [], union: [], juniorOnly: [], mentorOnly: [] };
  }

  const intersection: string[] = [];
  const unionSet = new Set<string>();

  for (const t of jSet) {
    unionSet.add(t);
    if (mSet.has(t)) {
      intersection.push(t);
    }
  }

  for (const t of mSet) {
    unionSet.add(t);
  }

  const union = Array.from(unionSet);
  const juniorOnly = Array.from(jSet).filter(t => !mSet.has(t));
  const mentorOnly = Array.from(mSet).filter(t => !jSet.has(t));

  const score = union.length > 0 ? intersection.length / union.length : 0;

  return {
    score: Number(score.toFixed(4)),
    intersection,
    union,
    juniorOnly,
    mentorOnly,
  };
}

/**
 * Calculates Activity Dampener based on verified pushes in the past quarter (90 days).
 * Sactivity = min(1.0, MentorActiveCommits / 45)
 */
export function calculateActivityDampener(mentorActiveCommits: number): {
  score: number;
  targetBenchmark: number;
} {
  const targetBenchmark = 45;
  const score = Math.min(1.0, Math.max(0, mentorActiveCommits / targetBenchmark));
  return {
    score: Number(score.toFixed(4)),
    targetBenchmark,
  };
}

/**
 * Computes Weighted Composite Affinity Score as formulated in Architecture Spec Section 6:
 * MatchScore = (0.55 × Slang) + (0.30 × Stopic) + (0.15 × Sactivity)
 */
export function computeMatchScore(
  junior: DeveloperProfile,
  mentor: DeveloperProfile
): {
  score: number;
  breakdown: MatchBreakdown;
} {
  const langResult = calculateLanguageAffinity(junior.languages, mentor.languages);
  const topicResult = calculateTopicAffinity(junior.topics, mentor.topics);
  const activityResult = calculateActivityDampener(mentor.commitActivity);

  const rawScore =
    0.55 * langResult.score +
    0.30 * topicResult.score +
    0.15 * activityResult.score;

  // Clamped and rounded to NUMERIC(4,3)
  const clampedScore = Math.min(1.0, Math.max(0.0, rawScore));
  const score = Number(clampedScore.toFixed(3));

  const breakdown: MatchBreakdown = {
    sLang: langResult.score,
    sTopic: topicResult.score,
    sActivity: activityResult.score,
    compositeScore: score,
    weights: {
      lang: 0.55,
      topic: 0.30,
      activity: 0.15,
    },
    languageDetails: {
      sharedLanguages: langResult.shared,
      juniorExclusive: langResult.juniorOnly,
      mentorExclusive: langResult.mentorOnly,
      cosineSimilarity: langResult.score,
    },
    topicDetails: {
      intersection: topicResult.intersection,
      union: topicResult.union,
      juniorOnly: topicResult.juniorOnly,
      mentorOnly: topicResult.mentorOnly,
      jaccardIndex: topicResult.score,
    },
    activityDetails: {
      mentorCommits90d: mentor.commitActivity,
      targetBenchmark: activityResult.targetBenchmark,
      activityScore: activityResult.score,
    },
    meetsThreshold: score >= ENV.MATCH_AFFINITY_THRESHOLD,
  };

  return {
    score,
    breakdown,
  };
}
