import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import { createDatabase, type UserDatabase } from '../../src/lib/database.js';

export async function localDatabase() {
  const db = await PGlite.create();
  let socketServer: PGLiteSocketServer | undefined;
  let database: UserDatabase | undefined;
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;`);
    const directory = new URL('../../prisma/migrations/', import.meta.url);
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await db.exec(await readFile(new URL(`${entry.name}/migration.sql`, directory), 'utf8'));
    }
    const reservation = createServer();
    reservation.listen(0, '127.0.0.1');
    await once(reservation, 'listening');
    const address = reservation.address();
    if (!address || typeof address === 'string') throw new Error('Porta local indisponível.');
    await new Promise<void>((resolve) => reservation.close(() => resolve()));
    socketServer = new PGLiteSocketServer({ db, port: address.port, host: '127.0.0.1' });
    await socketServer.start();
    database = createDatabase(`postgresql://postgres:postgres@127.0.0.1:${address.port}/postgres?sslmode=disable`, 1);
    const connection = database;
    const server = socketServer;
    return {
      db, database: connection,
      async close() { await connection.close(); await server.stop(); await db.close(); },
    };
  } catch (error) {
    await database?.close();
    await socketServer?.stop();
    await db.close();
    throw error;
  }
}
