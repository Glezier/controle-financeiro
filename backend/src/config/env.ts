import 'dotenv/config';
import { z } from 'zod';

function isPublicKey(key: string) {
  if (key.startsWith('sb_publishable_')) return true;
  try {
    const payload = key.split('.')[1];
    return payload !== undefined && JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'anon';
  } catch { return false; }
}

const corsValue = process.env.CORS_ORIGINS;

console.log('[cors] Configuração recebida:', JSON.stringify(corsValue));

for (const item of (corsValue ?? '').split(',')) {
  const value = item.trim();

  try {
    console.log('[cors] Comparação:', {
      recebido: value,
      normalizado: new URL(value).origin,
      iguais: new URL(value).origin === value,
    });
  } catch {
    console.log('[cors] URL inválida:', JSON.stringify(value));
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().refine((value) => {
    try { return ['postgres:', 'postgresql:'].includes(new URL(value).protocol); } catch { return false; }
  }, 'Informe uma URL PostgreSQL válida no .env local.'),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().refine(isPublicKey, 'Use uma chave publishable ou anon; nunca secret/service_role.'),
  CORS_ORIGINS: z.string().default('http://localhost:5173').transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url().refine((value) => new URL(value).origin === value, 'Informe a origem sem barra final ou caminho.')).min(1)),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});
export function loadEnv(source = process.env) { return envSchema.parse(source); }
