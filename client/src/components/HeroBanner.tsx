import React from 'react';
import { User, Profile } from '../types/index.js';
import { Sparkles, Activity, Tag, Code2, Calculator, Layers } from 'lucide-react';

interface HeroBannerProps {
  currentUser: User | null;
  profile: Profile | null;
  onOpenArchitecture: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  currentUser,
  profile,
  onOpenArchitecture,
}) => {
  const languages = profile?.languages || {};
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);

  const langPercentages = Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang, bytes]) => ({
      name: lang,
      bytes,
      pct: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    }));

  const getLangColor = (name: string) => {
    switch (name.toLowerCase()) {
      case 'typescript': return 'bg-cyan-500';
      case 'rust': return 'bg-orange-500';
      case 'python': return 'bg-emerald-500';
      case 'go': return 'bg-sky-400';
      case 'swift': return 'bg-rose-500';
      case 'javascript': return 'bg-yellow-400';
      case 'c': return 'bg-slate-400';
      case 'sql': return 'bg-indigo-400';
      default: return 'bg-violet-500';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 mb-8 border border-dark-border bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-cyan-950/20 shadow-glass">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Platform Mission & Mentee Signal Profile */}
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Zero-Survey GitHub Profile Ingestion</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight font-display">
            Automated Mentor Pairing <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400">
              via Vector Profiles &amp; Topic Affinity
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
            Eliminating subjective onboarding surveys. We programmatically parse public GitHub repositories, calculate normalized language cosine similarity, repository topic Jaccard index, and verified 90-day commit consistency.
          </p>

          {/* Current Developer Signal Card */}
          {currentUser && (
            <div className="mt-4 p-4 rounded-2xl bg-dark-bg/70 border border-slate-800/80 backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.handle}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-cyan-500/40"
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-sm">@{currentUser.handle}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1">{currentUser.bio}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-xs font-mono">
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{profile?.commit_activity || 0} commits (90d)</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-300">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{profile?.repo_count || 0} repos sampled</span>
                  </div>
                </div>
              </div>

              {/* Language Distribution Stacked Bar */}
              {langPercentages.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Language Vector Distribution (Step B)</span>
                    <div className="flex space-x-3">
                      {langPercentages.map(l => (
                        <span key={l.name} className="flex items-center space-x-1">
                          <span className={`w-2 h-2 rounded-full ${getLangColor(l.name)}`} />
                          <span className="text-slate-300">{l.name} {l.pct}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                    {langPercentages.map(l => (
                      <div
                        key={l.name}
                        style={{ width: `${l.pct}%` }}
                        className={`h-full ${getLangColor(l.name)} transition-all duration-500`}
                        title={`${l.name}: ${l.bytes.toLocaleString()} bytes (${l.pct}%)`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Topics */}
              {profile?.topics && profile.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] font-mono text-slate-400 flex items-center space-x-1 mr-1">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span>Topic Tags:</span>
                  </span>
                  {profile.topics.slice(0, 6).map(t => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Mathematical Match-Scoring Formulation */}
        <div className="lg:col-span-5 bg-dark-card/90 rounded-2xl p-5 border border-slate-800/80 shadow-inner">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center space-x-2 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span>Affinity Formulation (Spec §6)</span>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 font-semibold">
              Threshold S &ge; 0.65
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 font-mono text-xs text-slate-200 mb-4 text-center">
            <span className="text-cyan-400 font-bold">MatchScore</span> ={' '}
            <span className="text-sky-300 font-semibold">(0.55 &times; S<sub className="text-[9px]">lang</sub>)</span> +{' '}
            <span className="text-violet-300 font-semibold">(0.30 &times; S<sub className="text-[9px]">topic</sub>)</span> +{' '}
            <span className="text-emerald-300 font-semibold">(0.15 &times; S<sub className="text-[9px]">activity</sub>)</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
              <div className="w-6 h-6 rounded-md bg-sky-950 flex items-center justify-center font-mono font-bold text-sky-400 text-[11px] shrink-0 border border-sky-800/50">
                55%
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">Language Affinity (Cosine)</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  S<sub className="text-[9px]">lang</sub> = (&sum; J<sub className="text-[8px]">i</sub> &times; M<sub className="text-[8px]">i</sub>) / (&radic;&sum;J<sub className="text-[8px]">i</sub>&sup2; &times; &radic;&sum;M<sub className="text-[8px]">i</sub>&sup2;)
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
              <div className="w-6 h-6 rounded-md bg-violet-950 flex items-center justify-center font-mono font-bold text-violet-400 text-[11px] shrink-0 border border-violet-800/50">
                30%
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">Topic Affinity (Jaccard)</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  S<sub className="text-[9px]">topic</sub> = |Topics<sub className="text-[8px]">J</sub> &cap; Topics<sub className="text-[8px]">M</sub>| / |Topics<sub className="text-[8px]">J</sub> &cup; Topics<sub className="text-[8px]">M</sub>|
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800/40">
              <div className="w-6 h-6 rounded-md bg-emerald-950 flex items-center justify-center font-mono font-bold text-emerald-400 text-[11px] shrink-0 border border-emerald-800/50">
                15%
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-200">Activity Consistency Dampener</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  S<sub className="text-[9px]">activity</sub> = min(1.0, MentorCommits / 45)
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenArchitecture}
            className="w-full mt-4 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-cyan-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Architecture Specification Blueprint</span>
          </button>
        </div>
      </div>
    </div>
  );
};
