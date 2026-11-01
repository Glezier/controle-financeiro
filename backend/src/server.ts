import app, { database } from './index.js';
import { loadEnv } from './config/env.js';

const { PORT } = loadEnv();
const server = app.listen(PORT, () => console.log(`API disponível em http://localhost:${PORT}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { server.close(() => { void database.close().finally(() => process.exit(0)); }); });
}
