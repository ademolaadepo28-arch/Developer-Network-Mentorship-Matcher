import React, { useState } from 'react';
import { User, Persona, SyncStatus } from '../types/index.js';
import { 
  GitBranch, 
  RefreshCw, 
  ShieldCheck, 
  UserCheck, 
  ExternalLink, 
  Sparkles,
  ChevronDown,
  Layers,
  Activity
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  personas: Persona[];
  onSelectPersona: (handle: string) => void;
  onUpdateRole: (role: 'mentor' | 'mentee' | 'both') => void;
  onTriggerSync: () => void;
  syncStatus: SyncStatus | null;
  isSyncing: boolean;
  onOpenArchitecture: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  personas,
  onSelectPersona,
  onUpdateRole,
  onTriggerSync,
  syncStatus,
  isSyncing,
  onOpenArchitecture,
}) => {
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-dark-border bg-dark-bg/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Spec Title */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-emerald-400 p-[2px] shadow-glow-cyan">
            <div className="w-full h-full bg-dark-bg rounded-[10px] flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-cyan-400 animate-pulse-subtle" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-display">
                DevNetwork <span className="text-cyan-400 font-light">Matcher</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                MVP v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Public GitHub Activity &amp; Vector Profiles
            </p>
          </div>
        </div>

        {/* Center / Right Control Panel */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Rate-Limit Mitigation Quota Monitor */}
          <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">GitHub Quota:</span>
            <span className="font-mono text-emerald-400 font-medium">4,982/5,000</span>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">ETag 304</span>
          </div>

          {/* Architecture Spec Button */}
          <button
            onClick={onOpenArchitecture}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Architecture Spec</span>
          </button>

          {/* Trigger Background Sync */}
          <button
            onClick={onTriggerSync}
            disabled={isSyncing}
            title="Triggers asynchronous background crawl with ETag conditional caching"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 hover:border-cyan-500/60 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync GitHub'}</span>
          </button>

          {syncStatus?.userJob && syncStatus.userJob.status !== 'idle' && (
            <span className="hidden lg:inline-flex items-center px-2 py-1 rounded bg-slate-800/80 text-[10px] text-cyan-300 font-mono border border-slate-700">
              {syncStatus.userJob.status}
            </span>
          )}

          {/* Role Switcher Pill */}
          {currentUser && (
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <span className="capitalize">{currentUser.role}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl glass-panel border border-dark-border py-1 shadow-2xl z-50">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Switch Role
                  </div>
                  {(['mentee', 'mentor', 'both'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => {
                        onUpdateRole(r);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs capitalize flex items-center justify-between hover:bg-cyan-500/10 hover:text-cyan-300 ${
                        currentUser.role === r ? 'text-cyan-400 font-bold bg-cyan-500/15' : 'text-slate-300'
                      }`}
                    >
                      {r}
                      {currentUser.role === r && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Persona Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPersonaDropdownOpen(!personaDropdownOpen)}
              className="flex items-center space-x-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-cyan-500/30 transition-all text-xs font-medium text-slate-200"
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.handle}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-cyan-400/50"
                />
              ) : (
                <UserCheck className="w-4 h-4 text-cyan-400" />
              )}
              <span className="hidden sm:inline font-mono">@{currentUser?.handle || 'Select Persona'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            {personaDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl glass-panel border border-cyan-500/30 p-2 shadow-2xl z-50">
                <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
                  <span>Demo Personas</span>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </div>
                <p className="px-3 pb-2 text-[11px] text-slate-400">
                  Switch persona to test mentee feed, language vectors, and mentor matching:
                </p>

                <div className="space-y-1 max-h-72 overflow-y-auto">
                  {personas.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPersona(p.handle);
                        setPersonaDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center space-x-2.5 transition-all ${
                        currentUser?.handle === p.handle
                          ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                          : 'hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <img
                        src={p.avatar_url}
                        alt={p.handle}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-semibold truncate text-slate-200">
                            @{p.handle}
                          </span>
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                            p.role === 'mentor' 
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' 
                              : 'bg-indigo-950 text-indigo-300 border border-indigo-800/50'
                          }`}>
                            {p.role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{p.bio}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex justify-between items-center px-2">
                  <a
                    href="/api/v1/auth/github"
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-medium"
                  >
                    <span>Connect Live GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
