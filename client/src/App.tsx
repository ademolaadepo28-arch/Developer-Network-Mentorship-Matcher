import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { 
  getMe, 
  getMatches, 
  getPersonas, 
  loginWithPersona, 
  updateUserRole, 
  requestMentorship, 
  acceptMentorship, 
  triggerSync, 
  getSyncStatus 
} from './lib/api.js';
import { Match, User, Profile } from './types/index.js';
import { Navbar } from './components/Navbar.js';
import { HeroBanner } from './components/HeroBanner.js';
import { FilterBar } from './components/FilterBar.js';
import { MentorCard } from './components/MentorCard.js';
import { ScoreExplanationModal } from './components/ScoreExplanationModal.js';
import { ArchitectureModal } from './components/ArchitectureModal.js';
import { Sparkles, Users, RefreshCw, AlertCircle, CheckCircle, Sliders } from 'lucide-react';

export function App() {
  const [threshold, setThreshold] = useState<number>(0.65); // Architecture Spec Section 6 default
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [inspectMatch, setInspectMatch] = useState<Match | null>(null);
  const [architectureOpen, setArchitectureOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  };

  // 1. Fetch current authenticated user & profile
  const { data: meData, mutate: mutateMe, error: meError } = useSWR(
    '/api/v1/auth/me',
    getMe,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // If unauthenticated on first load, initialize with default junior mentee Alex Chen
  useEffect(() => {
    if (meError && !meData) {
      loginWithPersona('alexchen-dev')
        .then(() => mutateMe())
        .catch(console.error);
    }
  }, [meError, meData, mutateMe]);

  // 2. Fetch available demonstration personas
  const { data: personasData } = useSWR('/api/v1/auth/personas', getPersonas);
  const personas = personasData?.personas || [];

  // 3. Fetch feed matches
  const { data: matchesData, mutate: mutateMatches, isLoading: matchesLoading } = useSWR(
    meData?.user?.id ? [`/api/v1/matches/feed`, threshold, selectedLanguage, selectedTopic, selectedStatus] : null,
    () => getMatches({
      threshold,
      language: selectedLanguage,
      topic: selectedTopic,
      status: selectedStatus,
    }),
    {
      revalidateOnFocus: false,
    }
  );

  // 4. Fetch background sync status
  const { data: syncStatus, mutate: mutateSyncStatus } = useSWR(
    meData?.user?.id ? '/api/v1/sync/status' : null,
    getSyncStatus,
    { refreshInterval: isSyncing ? 2000 : 15000 }
  );

  const currentUser: User | null = meData?.user || null;
  const currentProfile: Profile | null = meData?.profile || null;

  // Extract unique available languages and topics for filter chips
  const { availableLanguages, availableTopics } = useMemo(() => {
    const langs = new Set<string>();
    const tops = new Set<string>();

    for (const p of personas) {
      if (p.languages) {
        Object.keys(p.languages).forEach(l => langs.add(l));
      }
      if (p.topics) {
        p.topics.forEach(t => tops.add(t));
      }
    }

    return {
      availableLanguages: Array.from(langs),
      availableTopics: Array.from(tops),
    };
  }, [personas]);

  // Filter matches by client-side text search (handle, bio)
  const filteredMatches = useMemo(() => {
    if (!matchesData?.matches) return [];
    if (!searchQuery.trim()) return matchesData.matches;

    const q = searchQuery.toLowerCase().trim();
    return matchesData.matches.filter(m => 
      m.mentor.handle.toLowerCase().includes(q) ||
      (m.mentor.bio && m.mentor.bio.toLowerCase().includes(q)) ||
      m.mentor.topics.some(t => t.toLowerCase().includes(q))
    );
  }, [matchesData, searchQuery]);

  // Handlers
  const handleSelectPersona = async (handle: string) => {
    try {
      await loginWithPersona(handle);
      await mutateMe();
      await mutateMatches();
      showToast(`Switched active persona to @${handle}`, 'info');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleUpdateRole = async (role: 'mentor' | 'mentee' | 'both') => {
    try {
      await updateUserRole(role);
      await mutateMe();
      await mutateMatches();
      showToast(`Updated role to ${role}`, 'success');
    } catch (err) {
      showToast((err as Error).message, 'error');
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await triggerSync();
      showToast('Enqueued background crawl. ETag conditional requests active.', 'info');
      // Wait briefly then revalidate
      setTimeout(async () => {
        await mutateMe();
        await mutateMatches();
        await mutateSyncStatus();
        setIsSyncing(false);
        showToast('Profile signals & match scores updated!', 'success');
      }, 2500);
    } catch (err) {
      setIsSyncing(false);
      showToast((err as Error).message, 'error');
    }
  };

  // Optimistic UI Update: Mentorship Request (Spec Section 2)
  const handleRequestMentorship = async (matchId: string) => {
    // 1. Optimistic update in cache
    mutateMatches(
      currentData => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          matches: currentData.matches.map(m =>
            m.id === matchId ? { ...m, status: 'requested' } : m
          ),
        };
      },
      false // do not revalidate immediately
    );

    try {
      // 2. Perform API request
      await requestMentorship(matchId);
      showToast('Mentorship request sent! Record transitioned to "requested".', 'success');
    } catch (err) {
      // 3. Rollback on failure
      mutateMatches();
      showToast(`Request failed: ${(err as Error).message}`, 'error');
    }
  };

  const handleAcceptMentorship = async (matchId: string) => {
    mutateMatches(
      currentData => {
        if (!currentData) return currentData;
        return {
          ...currentData,
          matches: currentData.matches.map(m =>
            m.id === matchId ? { ...m, status: 'accepted' } : m
          ),
        };
      },
      false
    );

    try {
      await acceptMentorship(matchId);
      showToast('Mentorship connection accepted!', 'success');
    } catch (err) {
      mutateMatches();
      showToast(`Accept failed: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-mesh bg-dark-bg text-slate-100 flex flex-col font-sans">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className={`flex items-center space-x-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-600/80 shadow-glow-emerald'
              : toast.type === 'info'
              ? 'bg-cyan-950 text-cyan-200 border-cyan-600/80 shadow-glow-cyan'
              : 'bg-rose-950 text-rose-200 border-rose-600/80'
          }`}>
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4 text-cyan-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        currentUser={currentUser}
        personas={personas}
        onSelectPersona={handleSelectPersona}
        onUpdateRole={handleUpdateRole}
        onTriggerSync={handleTriggerSync}
        syncStatus={syncStatus || null}
        isSyncing={isSyncing}
        onOpenArchitecture={() => setArchitectureOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero & Formulation Overview */}
        <HeroBanner
          currentUser={currentUser}
          profile={currentProfile}
          onOpenArchitecture={() => setArchitectureOpen(true)}
        />

        {/* Filter Controls */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          availableLanguages={availableLanguages}
          selectedTopic={selectedTopic}
          onSelectTopic={setSelectedTopic}
          availableTopics={availableTopics}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          threshold={threshold}
          onThresholdChange={setThreshold}
          totalMatches={filteredMatches.length}
        />

        {/* Mentors Grid / Matches Feed */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold text-white font-display">
                Recommendation Feed
              </h2>
              <span className="text-xs font-mono text-slate-400 font-medium">
                (Ranked by Composite Score &ge; {threshold})
              </span>
            </div>
          </div>

          {matchesLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm font-mono text-slate-400">Computing vector affinity scores...</p>
            </div>
          ) : filteredMatches.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMatches.map(match => (
                <MentorCard
                  key={match.id}
                  match={match}
                  onRequestMentorship={handleRequestMentorship}
                  onAcceptMentorship={handleAcceptMentorship}
                  onInspectScore={m => setInspectMatch(m)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center border border-slate-800 space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">No Mentors Exceed Selected Criteria</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                No mentors met the affinity threshold of &ge; {threshold} with the active filters. Try lowering the threshold slider or clearing the language/topic filter chips.
              </p>
              <button
                onClick={() => {
                  setThreshold(0.65);
                  setSelectedLanguage('');
                  setSelectedTopic('');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-950 text-cyan-300 border border-cyan-800/80 text-xs font-semibold hover:bg-cyan-900 transition-colors"
              >
                Reset Filters to Spec Defaults
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Mathematical Derivation Modal */}
      <ScoreExplanationModal
        match={inspectMatch}
        currentUser={currentUser}
        onClose={() => setInspectMatch(null)}
      />

      {/* Architecture Spec Blueprint Modal */}
      <ArchitectureModal
        isOpen={architectureOpen}
        onClose={() => setArchitectureOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-dark-border py-8 px-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Developer Network &amp; Mentorship Matcher • MVP v1.0 • Fly.io Blueprint
          </p>
          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span>Fastify (Node.js LTS)</span>
            <span>•</span>
            <span>React 19 + Tailwind</span>
            <span>•</span>
            <span>PostgreSQL 16 JSONB &amp; GIN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
