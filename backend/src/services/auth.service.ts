import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { ClientFactory } from '../domain/models.js';
import { AppError } from '../lib/errors.js';
import { logDiagnostic } from '../lib/diagnostic.js';

function authError(error: AuthError | null, fallback: string, status: number) {
  if (!error) return;
  logDiagnostic('[auth] Erro original do Supabase', error);
  if (error.status === 429) throw new AppError(429, 'AUTH_RATE_LIMITED', 'Muitas tentativas. Aguarde e tente novamente.');
  if (!error.status || error.status >= 500) throw new AppError(503, 'AUTH_UNAVAILABLE', 'Serviço de autenticação indisponível.');
  throw new AppError(status, 'AUTH_FAILED', fallback);
}

export function publicUser(user: User | null) {
  if (!user) return null;
  const fullName: unknown = user.user_metadata?.full_name;
  return { id: user.id, email: user.email, full_name: typeof fullName === 'string' ? fullName : null };
}
function publicSession(session: Session | null) {
  return session ? { access_token: session.access_token, refresh_token: session.refresh_token,
    expires_at: session.expires_at, expires_in: session.expires_in, token_type: session.token_type } : null;
}

export class AuthService {
  constructor(private createClient: ClientFactory) {}

  async register(input: { email: string; password: string; full_name?: string }) {
    const { email, password, full_name } = input;
    const { data, error } = await this.createClient().auth.signUp({ email, password,
      ...(full_name ? { options: { data: { full_name } } } : {}) });
    authError(error, 'Não foi possível cadastrar. Verifique os dados e as regras de senha.', 400);
    return { session: publicSession(data.session),
      message: data.session ? 'Cadastro concluído.' : 'Se o cadastro for permitido, confira seu e-mail para confirmar a conta.' };
  }

  async login(input: { email: string; password: string }) {
    const { data, error } = await this.createClient().auth.signInWithPassword(input);
    authError(error, 'E-mail ou senha inválidos, ou conta não confirmada.', 401);
    if (!data.session) throw new AppError(401, 'AUTH_FAILED', 'Não foi possível iniciar a sessão.');
    return { user: publicUser(data.user), session: publicSession(data.session) };
  }

  async refresh(refresh_token: string) {
    const { data, error } = await this.createClient().auth.refreshSession({ refresh_token });
    authError(error, 'Sessão inválida ou expirada. Faça login novamente.', 401);
    if (!data.session) throw new AppError(401, 'AUTH_FAILED', 'Sessão inválida ou expirada.');
    return { user: publicUser(data.user), session: publicSession(data.session) };
  }

  async logout(token: string) {
    const { error } = await this.createClient(token).auth.admin.signOut(token, 'local');
    authError(error, 'Não foi possível encerrar a sessão.', 401);
  }
}
