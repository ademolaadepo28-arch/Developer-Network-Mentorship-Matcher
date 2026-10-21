import { Match, User, Profile, Persona, SyncStatus } from '../types/index.js';

export const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.message || errJson.error || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const fetcher = <T>(url: string): Promise<T> => request<T>(url.replace('/api/v1', ''));

export async function getMe(): Promise<{ user: User; profile: Profile }> {
  return request<{ user: User; profile: Profile }>('/auth/me');
}

export async function getPersonas(): Promise<{ personas: Persona[] }> {
  return request<{ personas: Persona[] }>('/auth/personas');
}

export async function loginWithPersona(handle: string): Promise<{ user: User; token: string }> {
  return request<{ user: User; token: string }>('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ handle }),
  });
}

export async function updateUserRole(role: 'mentor' | 'mentee' | 'both'): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/role', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function logout(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/auth/logout', {
    method: 'POST',
  });
}

export async function getMatches(params: {
  threshold?: number;
  language?: string;
  topic?: string;
  status?: string;
}): Promise<{ threshold: number; total: number; matches: Match[] }> {
  const query = new URLSearchParams();
  if (params.threshold !== undefined) query.set('threshold', params.threshold.toString());
  if (params.language) query.set('language', params.language);
  if (params.topic) query.set('topic', params.topic);
  if (params.status && params.status !== 'all') query.set('status', params.status);

  return request<{ threshold: number; total: number; matches: Match[] }>(`/matches/feed?${query.toString()}`);
}

export async function requestMentorship(matchId: string): Promise<{ success: boolean; status: string; matchId: string }> {
  return request<{ success: boolean; status: string; matchId: string }>(`/matches/${matchId}/request`, {
    method: 'POST',
  });
}

export async function acceptMentorship(matchId: string): Promise<{ success: boolean; status: string; matchId: string }> {
  return request<{ success: boolean; status: string; matchId: string }>(`/matches/${matchId}/accept`, {
    method: 'POST',
  });
}

export async function triggerSync(): Promise<{ message: string; job: any }> {
  return request<{ message: string; job: any }>('/sync', {
    method: 'POST',
  });
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return request<SyncStatus>('/sync/status');
}
