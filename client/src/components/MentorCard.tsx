import React, { useState } from 'react';
import { Match } from '../types/index.js';
import { 
  Activity, 
  Code2, 
  Calculator, 
  Send, 
  CheckCircle2, 
  Clock, 
  Check, 
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MentorCardProps {
  match: Match;
  onRequestMentorship: (matchId: string) => Promise<void>;
  onAcceptMentorship: (matchId: string) => Promise<void>;
  onInspectScore: (match: Match) => void;
}

export const MentorCard: React.FC<MentorCardProps> = ({
  match,
  onRequestMentorship,
  onAcceptMentorship,
  onInspectScore,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mentor, score, status, breakdown } = match;

  const scorePct = Math.round(score * 100);

  // Score color gradient
  const getScoreColor = (s: number) => {
    if (s >= 0.85) return 'from-emerald-400 to-cyan-400 text-emerald-300';
    if (s >= 0.70) return 'from-cyan-400 to-sky-400 text-cyan-300';
    return 'from-amber-400 to-sky-400 text-amber-300';
  };

  const handleRequest = async () => {
    if (status !== 'suggested' || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Fire celebratory confetti for the optimistic match request!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#06b6d4', '#10b981', '#8b5cf6'],
      });
      await onRequestMentorship(match.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      confetti({
        particleCount: 80,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#06b6d4'],
      });
      await onAcceptMentorship(match.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sharedTopics = new Set(breakdown?.topicDetails?.intersection?.map(t => t.toLowerCase()) || []);

  const mentorLangs = Object.entries(mentor.languages || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const totalBytes = Object.values(mentor.languages || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="group glass-panel glass-panel-hover rounded-2xl p-6 border border-dark-border flex flex-col justify-between transition-all duration-300 relative overflow-hidden">
      {/* Radiant accent border highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Top Header Section */}
      <div>
        <div className="flex items-start justify-between gap-4 mb-4">
          {/* Mentor Profile Avatar & Handle */}
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <img
                src={mentor.avatarUrl}
                alt={mentor.handle}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-cyan-500/30 group-hover:ring-cyan-400 transition-all shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-dark-bg border border-dark-border">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white group-hover:text-cyan-300 transition-colors font-display">
                  @{mentor.handle}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                  Vetted Mentor
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mt-0.5 max-w-sm">
                {mentor.bio}
              </p>
            </div>
          </div>

          {/* Prominent Affinity Score Badge */}
          <div className="flex flex-col items-end shrink-0">
            <div className="relative flex items-center justify-center p-3 rounded-2xl bg-dark-bg/90 border border-slate-700/80 group-hover:border-cyan-500/50 transition-all shadow-inner">
              <div className="text-right">
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight bg-gradient-to-r ${getScoreColor(score)} bg-clip-text text-transparent`}>
                  {scorePct}%
                </div>
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  Match Affinity
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rolling Metrics & Activity Bar */}
        <div className="flex flex-wrap items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/60 text-xs mb-4">
          <div className="flex items-center space-x-1.5 text-slate-300 font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>{mentor.commitActivity} verified pushes</span>
            <span className="text-[10px] text-slate-500">(90d window)</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="flex items-center space-x-1.5 text-slate-300 font-mono">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>{mentor.repoCount} active repos</span>
          </div>
        </div>

        {/* Sub-Score Formula Weights Overview */}
        <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-[11px]">
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
            <div className="text-slate-400 text-[10px] uppercase">Language (55%)</div>
            <div className="text-sky-300 font-bold mt-0.5">
              {(breakdown.sLang * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
            <div className="text-slate-400 text-[10px] uppercase">Topic (30%)</div>
            <div className="text-violet-300 font-bold mt-0.5">
              {(breakdown.sTopic * 100).toFixed(1)}%
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 text-center">
            <div className="text-slate-400 text-[10px] uppercase">Activity (15%)</div>
            <div className="text-emerald-300 font-bold mt-0.5">
              {(breakdown.sActivity * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Primary Language Footprint */}
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span className="font-mono text-[11px]">Top Languages:</span>
            <div className="flex space-x-2 text-[11px] font-mono">
              {mentorLangs.map(([lang, bytes]) => {
                const pct = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
                return (
                  <span key={lang} className="text-slate-300 font-medium">
                    {lang} <span className="text-slate-400">{pct}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Topic Badges (Highlighting Mentee Overlaps!) */}
        <div className="mb-5">
          <div className="text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
            <span>Repository Topics:</span>
            {sharedTopics.size > 0 && (
              <span className="text-[10px] text-cyan-400 flex items-center space-x-1 font-semibold">
                <Sparkles className="w-3 h-3" />
                <span>{sharedTopics.size} shared with you</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {mentor.topics.slice(0, 7).map(topic => {
              const isShared = sharedTopics.has(topic.toLowerCase());
              return (
                <span
                  key={topic}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md flex items-center space-x-1 transition-all ${
                    isShared
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 font-semibold shadow-glow-cyan/40'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800'
                  }`}
                >
                  {isShared && <Check className="w-3 h-3 text-cyan-400" />}
                  <span>#{topic}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Actions: Inspect Math & Mentorship Request Transition */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Inspect Formula Button */}
        <button
          onClick={() => onInspectScore(match)}
          className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 text-xs font-medium transition-all shadow-sm"
        >
          <Calculator className="w-3.5 h-3.5 text-cyan-400" />
          <span>Inspect Math Breakdown</span>
        </button>

        {/* Optimistic Status Button */}
        <div className="flex items-center space-x-2">
          {status === 'suggested' && (
            <button
              onClick={handleRequest}
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-bold text-xs shadow-glow-cyan hover:shadow-cyan-400/50 transition-all duration-200"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Request Mentorship</span>
            </button>
          )}

          {status === 'requested' && (
            <div className="flex items-center space-x-2">
              <span className="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-800/60 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>Request Pending</span>
              </span>
              {/* Quick simulation button to demonstrate accepted state */}
              <button
                onClick={handleAccept}
                disabled={isSubmitting}
                title="Simulate mentor accepting this request"
                className="py-1.5 px-2.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 text-[11px] font-semibold transition-all"
              >
                Accept (Demo)
              </button>
            </div>
          )}

          {status === 'accepted' && (
            <span className="flex items-center space-x-1.5 py-1.5 px-3 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-600/70 text-xs font-bold shadow-glow-emerald">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Connected • Active</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
