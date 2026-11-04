import { inspect } from 'node:util';

export function logDiagnostic(context: string, error: unknown) {
  let details = inspect(error, { depth: 8, colors: false });
  for (const [key, value] of Object.entries(process.env)) {
    if (value && /PASSWORD|SECRET|TOKEN|KEY|DATABASE_URL|DIRECT_URL/i.test(key)) {
      details = details.split(value).join('[REDACTED]');
    }
  }
  details = details.replace(/(postgres(?:ql)?:\/\/)[^\s@]+@/gi, '$1[REDACTED]@')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]');
  console.error(context, details);
}
