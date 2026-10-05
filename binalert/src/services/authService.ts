import type { AuthSession, Role, User } from '../types';
import { DEMO_USERS } from './demoData';
import { latency, readLS, removeLS, ServiceError, writeLS } from './storage';
import { uid } from '../utils/format';

/**
 * AuthService — demo implementation backed by localStorage.
 * Swap `login/signup/me` for `fetch('/api/auth/...')` calls when the
 * Node/Express backend is connected; the interface stays identical.
 */

interface StoredUser extends User {
  password: string;
}

function seedUsers(): StoredUser[] {
  const existing = readLS<StoredUser[] | null>('users', null);
  if (existing) return existing;
  writeLS('users', DEMO_USERS);
  return [...DEMO_USERS];
}

function publicUser(u: StoredUser): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

function makeToken(user: User): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({ sub: user.id, role: user.role, iat: Date.now(), exp: Date.now() + 86400000 }),
  );
  return `${header}.${payload}.demo-signature`;
}

export const authService = {
  async login(email: string, password: string, roleOverride?: Role): Promise<AuthSession> {
    await latency(400, 800);
    const users = seedUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || user.password !== password) {
      throw new ServiceError('invalid-credentials', 'Invalid email or password. Try the demo accounts below.');
    }
    if (roleOverride && user.role !== roleOverride) {
      throw new ServiceError(
        'role-mismatch',
        `This account is registered as ${user.role}. Select the matching role or use its own credentials.`,
      );
    }
    const session: AuthSession = { token: makeToken(user), user: publicUser(user) };
    writeLS('session', session);
    return session;
  },

  async signup(name: string, email: string, password: string, role: Role): Promise<AuthSession> {
    await latency(500, 900);
    const users = seedUsers();
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      throw new ServiceError('email-exists', 'An account with this email already exists. Try signing in.');
    }
    if (password.length < 8) {
      throw new ServiceError('weak-password', 'Password must be at least 8 characters.');
    }
    const user: StoredUser = {
      id: uid('u'),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
      location: 'Zone A — Riverside',
      joinedAt: new Date().toISOString(),
      ecoScore: 50,
      points: 0,
      level: 1,
      badges: [],
      avatarHue: Math.floor(Math.random() * 360),
    };
    users.push(user);
    writeLS('users', users);
    const session: AuthSession = { token: makeToken(user), user: publicUser(user) };
    writeLS('session', session);
    return session;
  },

  async me(): Promise<User | null> {
    const session = readLS<AuthSession | null>('session', null);
    if (!session) return null;
    const users = seedUsers();
    const user = users.find((u) => u.id === session.user.id);
    return user ? publicUser(user) : null;
  },

  logout(): void {
    removeLS('session');
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    await latency(500, 900);
    const users = seedUsers();
    const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    // Never reveal whether an account exists.
    return {
      message: exists
        ? 'If an account exists for this email, a reset link has been sent.'
        : 'If an account exists for this email, a reset link has been sent.',
    };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    await latency(500, 900);
    if (!token) throw new ServiceError('invalid-token', 'This reset link is invalid or has expired.');
    if (newPassword.length < 8) throw new ServiceError('weak-password', 'Password must be at least 8 characters.');
    const session = readLS<AuthSession | null>('session', null);
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === (session?.user.id ?? 'u-citizen'));
    if (idx >= 0) {
      users[idx] = { ...users[idx], password: newPassword };
      writeLS('users', users);
    }
    return { message: 'Password updated. Sign in with your new password.' };
  },

  async updateUser(id: string, patch: Partial<Pick<User, 'name' | 'location'>>): Promise<User> {
    await latency(300, 600);
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'User not found.');
    users[idx] = { ...users[idx], ...patch };
    writeLS('users', users);
    const session = readLS<AuthSession | null>('session', null);
    if (session && session.user.id === id) {
      const next = { ...session, user: publicUser(users[idx]) };
      writeLS('session', next);
    }
    return publicUser(users[idx]);
  },

  async awardPoints(id: string, points: number, ecoScoreDelta = 0): Promise<User> {
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'User not found.');
    const u = users[idx];
    const newPoints = u.points + points;
    const level = Math.max(1, Math.floor(newPoints / 400) + 1);
    users[idx] = {
      ...u,
      points: newPoints,
      level,
      ecoScore: Math.min(100, u.ecoScore + ecoScoreDelta),
    };
    writeLS('users', users);
    const session = readLS<AuthSession | null>('session', null);
    if (session && session.user.id === id) {
      writeLS('session', { ...session, user: publicUser(users[idx]) });
    }
    return publicUser(users[idx]);
  },

  async grantBadge(id: string, badgeId: string): Promise<User> {
    const users = seedUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) throw new ServiceError('not-found', 'User not found.');
    if (!users[idx].badges.includes(badgeId)) {
      users[idx] = { ...users[idx], badges: [...users[idx].badges, badgeId] };
      writeLS('users', users);
    }
    return publicUser(users[idx]);
  },
};
