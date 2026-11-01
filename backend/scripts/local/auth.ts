import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createClient, type User } from '@supabase/supabase-js';
import type { PGlite } from '@electric-sql/pglite';
import type { ClientFactory } from '../../src/domain/models.js';

interface Account { user: User; salt: string; passwordHash: Buffer }
interface Session { userId: string; refreshToken: string }
interface Access { sessionId: string; expiresAt: number }

export class LocalAuth {
  private accounts = new Map<string, Account>();
  private users = new Map<string, User>();
  private sessions = new Map<string, Session>();
  private refresh = new Map<string, string>();
  private access = new Map<string, Access>();

  constructor(private db: PGlite) {}

  async addAccount(email: string, password: string, fullName: string) {
    email = email.trim().toLowerCase();
    if (this.accounts.has(email)) throw new Error('Conta local já cadastrada.');
    const timestamp = new Date().toISOString();
    const user: User = { id: randomUUID(), email, aud: 'authenticated', role: 'authenticated',
      created_at: timestamp, updated_at: timestamp, email_confirmed_at: timestamp,
      app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { full_name: fullName } };
    const salt = randomBytes(16).toString('hex');
    await this.db.query('insert into auth.users(id) values ($1)', [user.id]);
    this.accounts.set(email, { user, salt, passwordHash: scryptSync(password, salt, 64) });
    this.users.set(user.id, user);
    return user;
  }

  private issue(userId: string, existingId?: string) {
    const id = existingId ?? randomUUID();
    const prior = this.sessions.get(id);
    if (prior) this.refresh.delete(prior.refreshToken);
    const refreshToken = randomBytes(32).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'LOCAL-DEMO', typ: 'JWT' })}.${encode({ sub: userId, exp: now + 3600, iat: now,
      role: 'authenticated', aud: 'authenticated', session_id: id, iss: 'local-demo' })}.${randomBytes(32).toString('base64url')}`;
    this.sessions.set(id, { userId, refreshToken });
    this.refresh.set(refreshToken, id);
    this.access.set(token, { sessionId: id, expiresAt: now + 3600 });
    return { access_token: token, refresh_token: refreshToken, token_type: 'bearer',
      expires_in: 3600, expires_at: now + 3600, user: this.users.get(userId)! };
  }

  private json(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  }

  private invalid() { return this.json({ message: 'Credenciais locais inválidas.', code: 'invalid_credentials' }, 401); }

  private transport: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== 'https://local-auth.invalid') throw new Error('O modo local não acessa serviços de autenticação externos.');
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    if (url.pathname === '/auth/v1/signup') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      if (!email || password.length < 8 || this.accounts.has(email)) {
        return this.json({ message: 'Cadastro local inválido.', code: 'signup_invalid' }, 400);
      }
      const metadata = body.data as { full_name?: unknown } | undefined;
      const user = await this.addAccount(email, password, typeof metadata?.full_name === 'string' ? metadata.full_name : 'Usuário local');
      return this.json(this.issue(user.id));
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'password') {
      const account = this.accounts.get(typeof body.email === 'string' ? body.email.toLowerCase() : '');
      if (!account || typeof body.password !== 'string' ||
          !timingSafeEqual(account.passwordHash, scryptSync(body.password, account.salt, 64))) return this.invalid();
      return this.json(this.issue(account.user.id));
    }
    if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'refresh_token') {
      const id = this.refresh.get(typeof body.refresh_token === 'string' ? body.refresh_token : '');
      const session = id ? this.sessions.get(id) : undefined;
      if (!session) return this.invalid();
      return this.json(this.issue(session.userId, id));
    }
    const token = /^Bearer (.+)$/i.exec(headers.get('Authorization') ?? '')?.[1];
    const access = token ? this.access.get(token) : undefined;
    const session = access ? this.sessions.get(access.sessionId) : undefined;
    if (!access || access.expiresAt <= Date.now() / 1000 || !session) return this.invalid();
    if (url.pathname === '/auth/v1/user') return this.json(this.users.get(session.userId));
    if (url.pathname === '/auth/v1/logout') {
      this.refresh.delete(session.refreshToken);
      return new Response(null, { status: 204 });
    }
    return this.json({ message: 'Endpoint de simulação inexistente.' }, 404);
  };

  createClient: ClientFactory = (token) => createClient('https://local-auth.invalid', 'sb_publishable_local_demo', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: this.transport, headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}
