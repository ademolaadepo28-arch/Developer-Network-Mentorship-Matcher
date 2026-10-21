export interface UserSession {
  id: string;
  githubId: number;
  handle: string;
  role: 'mentor' | 'mentee' | 'both' | 'undecided';
  avatarUrl?: string;
  bio?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserSession;
  }
}
