import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3002/api/v1';
const run = randomUUID().slice(0, 12);
const categoryIds = [];
const transactionIds = [];
let session;
let other;

async function call(path, { method = 'GET', body, token, status = 200 } = {}) {
  const response = await fetch(api + path, { method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? null : await response.json();
  if (response.status !== status) {
    throw new Error(`${method} ${path}: esperado HTTP ${status}, recebido ${response.status}. ${data?.error?.message ?? ''}`);
  }
  return data;
}

try {
  const health = await fetch('http://127.0.0.1:3002/health/db');
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-local-demo'), 'true', 'A porta 3002 precisa executar a demonstração local.');
  console.log('PostgreSQL local: OK');
  const email = `teste-${run}@local.test`;
  const password = 'Demo12345!';
  await call('/auth/register', { method: 'POST', status: 201,
    body: { email, password, full_name: 'Teste Local' } });
  await call('/auth/login', { method: 'POST', status: 401, body: { email, password: 'senha-incorreta' } });
  session = (await call('/auth/login', { method: 'POST', body: { email, password } })).data.session;
  const token = session.access_token;
  const categories = new Map();
  for (const name of ['Renda', 'Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Lazer']) {
    const row = (await call('/categories', { method: 'POST', token, status: 201,
      body: { name: `${name} teste ${run}`, type: name === 'Renda' ? 'income' : 'expense', icon: name === 'Renda' ? 'account_balance_wallet' : 'category' } })).data;
    categories.set(name, row.id);
    categoryIds.push(row.id);
  }
  for (const [name, type, amount, status] of [
    ['Renda', 'income', 5000, 'paid'], ['Renda', 'income', 800, 'paid'],
    ['Moradia', 'expense', 1450, 'paid'], ['Alimentação', 'expense', 420.30, 'paid'],
    ['Saúde', 'expense', 159.20, 'paid'], ['Transporte', 'expense', 200, 'paid'],
    ['Lazer', 'expense', 150, 'paid'], ['Transporte', 'expense', 350, 'pending'],
  ]) {
    const row = (await call('/transactions', { method: 'POST', token, status: 201,
      body: { category_id: categories.get(name), type, amount, status,
        date: '2024-10-24', description: `Teste local ${run} ${name}` } })).data;
    transactionIds.push(row.id);
  }
  const report = (await call('/dashboard?year=2024&month=10', { token })).data;
  assert.equal(report.paid_income, '5800.00');
  assert.equal(report.paid_expense, '2379.50');
  assert.equal(report.available_balance, '3420.50');
  assert.equal(report.pending_expense, '350.00');
  assert.equal(report.transaction_count, 8);
  console.log('Cadastro/login simulado e inclusão de categorias/transações: OK');
  console.log('Saldo R$ 3.420,50; pendência R$ 350,00 fora do saldo: OK');
  await call('/transactions/' + transactionIds[1], { method: 'PATCH', token, body: { amount: 850 } });
  assert.equal((await call('/dashboard', { token })).data.available_balance, '3470.50');
  await call('/transactions/' + transactionIds[1], { method: 'PATCH', token, body: { amount: 800 } });
  const filtered = await call('/transactions?year=2024&month=10&type=expense&status=paid&limit=2&page=2', { token });
  assert.equal(filtered.pagination.total, 5);
  assert.equal(filtered.data.length, 2);
  const pending = (await call('/dashboard?status=pending', { token })).data;
  assert.equal(pending.available_balance, '0.00');
  const monthly = (await call('/reports/monthly?year=2024', { token })).data;
  assert.equal(monthly.months.length, 12);
  assert.equal(monthly.months[9].net, '3420.50');
  await call('/categories/' + categories.get('Transporte'), { method: 'DELETE', token, status: 409 });
  console.log('Edição, filtros, paginação, relatório e categoria em uso: OK');
  other = (await call('/auth/register', { method: 'POST', status: 201,
    body: { email: `outro-${run}@local.test`, password, full_name: 'Outra Conta' } })).data.session;
  const foreignToken = other.access_token;
  assert.equal((await call('/transactions', { token: foreignToken })).data.length, 0);
  await call('/transactions/' + transactionIds[0], { token: foreignToken, status: 404 });
  await call('/transactions/' + transactionIds[0], { method: 'PATCH', token: foreignToken, status: 404, body: { amount: 1 } });
  await call('/transactions/' + transactionIds[0], { method: 'DELETE', token: foreignToken, status: 404 });
  console.log('Isolamento entre dois usuários: OK');
  for (const id of [...transactionIds]) {
    await call('/transactions/' + id, { method: 'DELETE', token, status: 204 });
    transactionIds.splice(transactionIds.indexOf(id), 1);
  }
  for (const id of [...categoryIds]) {
    await call('/categories/' + id, { method: 'DELETE', token, status: 204 });
    categoryIds.splice(categoryIds.indexOf(id), 1);
  }
  assert.equal((await call('/dashboard', { token })).data.transaction_count, 0);
  await call('/auth/logout', { method: 'POST', token, status: 204 });
  await call('/auth/refresh', { method: 'POST', status: 401, body: { refresh_token: session.refresh_token } });
  console.log('Exclusão dos registros e logout simulado: OK');
  console.log('Testes locais concluídos com sucesso. Nenhum acesso ao Supabase foi necessário.');
} catch (error) {
  console.error(error?.cause?.code === 'ECONNREFUSED'
    ? 'Inicie npm.cmd run dev:local em outro terminal antes de testar.'
    : `Teste local falhou: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (session) {
    for (const id of transactionIds) {
      try { await call('/transactions/' + id, { method: 'DELETE', token: session.access_token, status: 204 }); }
      catch { console.error('Não foi possível limpar uma transação temporária. Encerrar a demonstração descarta o banco local.'); }
    }
    for (const id of categoryIds) {
      try { await call('/categories/' + id, { method: 'DELETE', token: session.access_token, status: 204 }); }
      catch { console.error('Não foi possível limpar uma categoria temporária. Encerrar a demonstração descarta o banco local.'); }
    }
  }
  if (other) {
    try { await call('/auth/logout', { method: 'POST', token: other.access_token, status: 204 }); }
    catch { }
  }
}
