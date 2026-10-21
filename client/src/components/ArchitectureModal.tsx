import React from 'react';
import { X, Layers, Server, Database, Globe, Shield, RefreshCw, Cloud } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl p-6 sm:p-8 border border-dark-border bg-dark-bg/95 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider font-mono">
            <Layers className="w-4 h-4" />
            <span>Architecture Specification Blueprint MVP v1.0</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-1">
            System Architecture &amp; Fly.io Target
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated Pairing Platform via Public GitHub Activity &amp; Vector Profiles
          </p>
        </div>

        {/* 1. Visual Flow Overview Diagram */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            1. System Architecture Overview
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center text-xs font-mono">
            <div className="p-3 rounded-xl bg-dark-card border border-cyan-500/40 space-y-1 shadow-glow-cyan/20">
              <div className="w-8 h-8 mx-auto rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="font-bold text-white">React SPA</div>
              <div className="text-[10px] text-slate-400">Vite • Tailwind • SWR</div>
              <div className="text-[9px] text-cyan-400">Bearer Auth / Cookie</div>
            </div>

            <div className="p-3 rounded-xl bg-dark-card border border-indigo-500/40 space-y-1 shadow-glow-violet/20">
              <div className="w-8 h-8 mx-auto rounded-lg bg-indigo-950 flex items-center justify-center text-indigo-400">
                <Server className="w-4 h-4" />
              </div>
              <div className="font-bold text-white">Fastify Server Engine</div>
              <div className="text-[10px] text-slate-400">Fastify-OAuth2 • Ajv</div>
              <div className="text-[9px] text-indigo-400">In-Process Worker Queue</div>
            </div>

            <div className="p-3 rounded-xl bg-dark-card border border-emerald-500/40 space-y-1 shadow-glow-emerald/20">
              <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
                <Database className="w-4 h-4" />
              </div>
              <div className="font-bold text-white">PostgreSQL 16</div>
              <div className="text-[10px] text-slate-400">JSONB &amp; GIN Indexes</div>
              <div className="text-[9px] text-emerald-400">Fly Postgres Cluster</div>
            </div>

            <div className="p-3 rounded-xl bg-dark-card border border-sky-500/40 space-y-1">
              <div className="w-8 h-8 mx-auto rounded-lg bg-sky-950 flex items-center justify-center text-sky-400">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="font-bold text-white">GitHub REST API v3</div>
              <div className="text-[10px] text-slate-400">5,000 req/hr budget</div>
              <div className="text-[9px] text-sky-400">ETag 304 Not Modified</div>
            </div>
          </div>
        </div>

        {/* 2. Technology Rationalization */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-cyan-400 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>AES-256-GCM Token Encryption</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              GitHub OAuth access tokens are encrypted at rest with random 12-byte IVs and authenticated tags prior to database storage, ensuring zero plain-text credential leaks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rate Mitigation &amp; ETag Caching</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              ETag headers are persisted per resource in <code className="font-mono text-emerald-300">sync_etags</code>. Fastify issues conditional HTTP requests returning 304 Not Modified, consuming zero quota points from GitHub's 5,000/hr budget.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-indigo-400 flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL JSONB &amp; GIN Indexing</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Normalized byte maps are stored in <code className="font-mono text-indigo-300">profiles.languages (JSONB)</code> and repository tags in <code className="font-mono text-indigo-300">profiles.topics (TEXT[])</code> with GIN indexing for fast multi-dimensional queries.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-400 flex items-center space-x-1.5">
              <Cloud className="w-3.5 h-3.5" />
              <span>Fly.io Multi-Region Blueprint</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Multi-stage Alpine Dockerfile hosting built React assets and Fastify API with <code className="font-mono text-amber-300">auto_stop_machines = true</code> and <code className="font-mono text-amber-300">min_machines_running = 1</code>.
            </p>
          </div>
        </div>

        {/* 3. REST Contract Endpoints Table */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="text-xs font-bold text-slate-300 font-mono">
            7. RESTful Contract Endpoints
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-mono">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-800/60">
                <tr>
                  <th className="p-2">Endpoint</th>
                  <th className="p-2">Auth</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="p-2 text-cyan-400">GET /api/v1/auth/github</td>
                  <td className="p-2 text-slate-400">Public</td>
                  <td className="p-2">Generates CSRF state &amp; redirects to GitHub OAuth</td>
                </tr>
                <tr>
                  <td className="p-2 text-cyan-400">POST /api/v1/sync</td>
                  <td className="p-2 text-slate-400">JWT User</td>
                  <td className="p-2">Enqueues background crawl of repos</td>
                </tr>
                <tr>
                  <td className="p-2 text-cyan-400">GET /api/v1/matches/feed</td>
                  <td className="p-2 text-slate-400">JWT Junior</td>
                  <td className="p-2">Returns ranked mentors sorted by score &ge; 0.65</td>
                </tr>
                <tr>
                  <td className="p-2 text-cyan-400">POST /api/v1/matches/:id/request</td>
                  <td className="p-2 text-slate-400">JWT Junior</td>
                  <td className="p-2">Sends mentorship request (transitions to 'requested')</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
