import { assertLocalDemoAllowed, createLocalDemo } from './demo.js';

assertLocalDemoAllowed();
const demo = await createLocalDemo();
const server = demo.app.listen(3002, '127.0.0.1');
server.once('listening', () => {
  console.log('DEMONSTRAÇÃO LOCAL: banco temporário e autenticação simulada.');
  console.log('API: http://127.0.0.1:3002/api/v1');
  console.log('Conta: demo@local.test | Senha de demonstração: Demo12345!');
  console.log('Outra conta, sem os dados da primeira: outro@local.test | Demo12345!');
  console.log('Dados de outubro/2024. Ao encerrar, os dados locais são descartados.');
  console.log('Este modo não usa DATABASE_URL nem a chave do Supabase.');
});
server.once('error', async (error) => {
  console.error('Falha ao iniciar demonstração local:', error.message);
  await demo.close();
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => { server.close(() => { void demo.close().finally(() => process.exit(0)); }); });
}
