import React from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  availableLanguages: string[];
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
  availableTopics: string[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  totalMatches: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedLanguage,
  onSelectLanguage,
  availableLanguages,
  selectedTopic,
  onSelectTopic,
  availableTopics,
  selectedStatus,
  onSelectStatus,
  threshold,
  onThresholdChange,
  totalMatches,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 mb-6 border border-dark-border space-y-4">
      {/* Top Row: Search and Score Threshold Slider */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Filter mentors by handle, bio, or domain keywords..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-dark-bg/80 border border-slate-700/80 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans"
          />
        </div>

        {/* Affinity Score Slider */}
        <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-dark-bg/80 border border-slate-700/80 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
          <div className="flex flex-col">
            <div className="flex items-center justify-between text-xs space-x-3">
              <span className="text-slate-400 font-medium">Affinity Threshold:</span>
              <span className="font-mono text-cyan-400 font-bold">&ge; {Math.round(threshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={e => onThresholdChange(parseFloat(e.target.value))}
              className="w-36 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
            />
          </div>
          {threshold === 0.65 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
              SPEC DEFAULT
            </span>
          )}
        </div>
      </div>

      {/* Middle Row: Mentor Filtering Chips */}
      <div className="space-y-2.5 pt-1">
        {/* Languages Chips */}
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-xs font-mono text-slate-400 mr-2 shrink-0">Language Footprint:</span>
          <button
            onClick={() => onSelectLanguage('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              selectedLanguage === ''
                ? 'bg-cyan-500 text-white font-semibold shadow-glow-cyan'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
            }`}
          >
            All Languages
          </button>
          {availableLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => onSelectLanguage(selectedLanguage === lang ? '' : lang)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedLanguage === lang
                  ? 'bg-cyan-500 text-white font-semibold shadow-glow-cyan'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Topics Chips */}
        {availableTopics.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-mono text-slate-400 mr-2 shrink-0">Repository Topics:</span>
            <button
              onClick={() => onSelectTopic('')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
                selectedTopic === ''
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              #all-topics
            </button>
            {availableTopics.slice(0, 8).map(topic => (
              <button
                key={topic}
                onClick={() => onSelectTopic(selectedTopic === topic ? '' : topic)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
                  selectedTopic === topic
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                }`}
              >
                #{topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Row: Status Filter Tabs and Results Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60 text-xs">
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-400 font-medium mr-1.5">Status:</span>
          {(['all', 'suggested', 'requested', 'accepted'] as const).map(st => (
            <button
              key={st}
              onClick={() => onSelectStatus(st)}
              className={`capitalize px-2.5 py-1 rounded-lg transition-all ${
                selectedStatus === st
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-slate-400 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            <strong className="text-cyan-400">{totalMatches}</strong> vetted mentors meeting threshold
          </span>
        </div>
      </div>
    </div>
  );
};
