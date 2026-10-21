import React from 'react';
import { Match, User } from '../types/index.js';
import { X, Calculator, Check, Tag, Code2, Activity } from 'lucide-react';

interface ScoreExplanationModalProps {
  match: Match | null;
  currentUser: User | null;
  onClose: () => void;
}

export const ScoreExplanationModal: React.FC<ScoreExplanationModalProps> = ({
  match,
  currentUser,
  onClose,
}) => {
  if (!match) return null;

  const { mentor, score, breakdown } = match;
  const { sLang, sTopic, sActivity, languageDetails, topicDetails, activityDetails } = breakdown;

  const scorePct = Math.round(score * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl glass-panel rounded-3xl p-6 sm:p-8 border border-cyan-500/30 bg-dark-bg/95 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Calculator className="w-4 h-4" />
            <span>Mathematical Score Derivation (Spec Section 6)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
            Match Affinity Explanation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Comparing vector profiles between mentee <strong className="text-cyan-300">@{currentUser?.handle || 'junior'}</strong> and mentor <strong className="text-cyan-300">@{mentor.handle}</strong>.
          </p>
        </div>

        {/* Composite Score Result Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-dark-card to-cyan-950/40 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Computed Affinity Score
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
              {score.toFixed(3)}{' '}
              <span className="text-lg font-bold text-slate-400">({scorePct}%)</span>
            </div>
            <div className="text-xs text-emerald-400 flex items-center space-x-1.5 mt-1 font-semibold">
              <Check className="w-3.5 h-3.5" />
              <span>Exceeds recommendation threshold (&ge; 0.650)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-dark-bg/80 border border-slate-800 font-mono text-xs text-slate-300 space-y-1">
            <div className="text-[11px] text-slate-500 uppercase font-bold">Sum of Weighted Components:</div>
            <div>0.55 &times; {sLang.toFixed(3)} = <span className="text-sky-300 font-bold">{(0.55 * sLang).toFixed(3)}</span></div>
            <div>0.30 &times; {sTopic.toFixed(3)} = <span className="text-violet-300 font-bold">{(0.30 * sTopic).toFixed(3)}</span></div>
            <div>0.15 &times; {sActivity.toFixed(3)} = <span className="text-emerald-300 font-bold">{(0.15 * sActivity).toFixed(3)}</span></div>
            <div className="pt-1 border-t border-slate-700 text-white font-bold">
              Total = <span className="text-cyan-400">{score.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Component 1: Language Affinity (55%) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <h4 className="font-bold text-sm text-slate-200">
                1. Language Affinity (<span className="text-sky-400">S<sub className="text-[10px]">lang</sub> • 55% Weight</span>)
              </h4>
            </div>
            <span className="font-mono text-xs font-bold text-sky-400">
              Cosine Similarity: {sLang.toFixed(4)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-400 text-center">
            S<sub className="text-[9px]">lang</sub> = (&sum; J<sub className="text-[9px]">i</sub> &times; M<sub className="text-[9px]">i</sub>) / (&radic;(&sum; J<sub className="text-[9px]">i</sub>&sup2;) &times; &radic;(&sum; M<sub className="text-[9px]">i</sub>&sup2;))
          </div>

          {/* Shared Languages Table */}
          {languageDetails.sharedLanguages.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 font-semibold">Shared Language Footprints:</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] font-mono text-slate-400 uppercase bg-slate-800/60">
                    <tr>
                      <th className="p-2 rounded-l-lg">Language</th>
                      <th className="p-2">Mentee Bytes (%)</th>
                      <th className="p-2">Mentor Bytes (%)</th>
                      <th className="p-2 rounded-r-lg">Overlap Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {languageDetails.sharedLanguages.map(l => (
                      <tr key={l.name} className="hover:bg-slate-800/30">
                        <td className="p-2 font-semibold text-slate-200">{l.name}</td>
                        <td className="p-2 text-slate-300">{l.juniorBytes.toLocaleString()} B ({l.juniorPct}%)</td>
                        <td className="p-2 text-slate-300">{l.mentorBytes.toLocaleString()} B ({l.mentorPct}%)</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-semibold">
                            Strong Correlation
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 italic">No direct language vector overlap.</div>
          )}

          {languageDetails.mentorExclusive.length > 0 && (
            <div className="text-xs text-slate-400 pt-1">
              <span className="font-semibold text-slate-300">Mentor provides expansion into: </span>
              {languageDetails.mentorExclusive.join(', ')}
            </div>
          )}
        </div>

        {/* Component 2: Topic Affinity (30%) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-violet-400" />
              <h4 className="font-bold text-sm text-slate-200">
                2. Topic Affinity (<span className="text-violet-400">S<sub className="text-[10px]">topic</sub> • 30% Weight</span>)
              </h4>
            </div>
            <span className="font-mono text-xs font-bold text-violet-400">
              Jaccard Index: {sTopic.toFixed(4)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-400 text-center">
            S<sub className="text-[9px]">topic</sub> = |Topics<sub className="text-[9px]">J</sub> &cap; Topics<sub className="text-[9px]">M</sub>| / |Topics<sub className="text-[9px]">J</sub> &cup; Topics<sub className="text-[9px]">M</sub>|
          </div>

          {/* Intersection Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-semibold">
                Intersection Topics<sub className="text-[9px]">J</sub> &cap; Topics<sub className="text-[9px]">M</sub> ({topicDetails.intersection.length}):
              </span>
              <span className="text-violet-300 font-bold">
                Numerator: {topicDetails.intersection.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topicDetails.intersection.length > 0 ? (
                topicDetails.intersection.map(t => (
                  <span
                    key={t}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-violet-950 text-violet-300 border border-violet-700/60 font-semibold"
                  >
                    #{t}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No overlapping repository topic labels.</span>
              )}
            </div>
          </div>

          {/* Union Count */}
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
            <span>Total Distinct Topics across both profiles (Union size):</span>
            <span className="text-slate-200 font-bold">Denominator: {topicDetails.union.length}</span>
          </div>
        </div>

        {/* Component 3: Activity Consistency Dampener (15%) */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h4 className="font-bold text-sm text-slate-200">
                3. Activity Consistency Dampener (<span className="text-emerald-400">S<sub className="text-[10px]">activity</sub> • 15% Weight</span>)
              </h4>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400">
              Activity Score: {sActivity.toFixed(4)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-xs text-slate-400 text-center">
            S<sub className="text-[9px]">activity</sub> = min(1.0, MentorActiveCommits / 45)
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">
                Mentor Verified Pushes: <strong>{activityDetails.mentorCommits90d}</strong> commits
              </span>
              <span className="text-slate-400">
                Quarterly Target: <strong>{activityDetails.targetBenchmark}</strong> commits
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                style={{ width: `${Math.min(100, (activityDetails.mentorCommits90d / activityDetails.targetBenchmark) * 100)}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {activityDetails.mentorCommits90d >= activityDetails.targetBenchmark
                ? '✓ Full 100% active mentor score awarded (exceeds quarterly benchmark).'
                : `Proportional activity factor: ${(sActivity * 100).toFixed(1)}% of quarterly benchmark.`}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-glow-cyan"
          >
            Close Explanation
          </button>
        </div>
      </div>
    </div>
  );
};
