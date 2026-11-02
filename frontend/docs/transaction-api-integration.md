# Integração de transações com a API

A aplicação usa a API autenticada para listar, criar, editar e excluir transações.
`createFinanceService(adapter)` continua disponível para os testes dos mocks;
a instância `financeService` substitui suas operações de transações pelo serviço HTTP.
Dashboard e relatórios também usam a API (veja `report-api-integration.md`). O atalho de criação do
dashboard abre `/transacoes?new=1`, usando o cadastro real e suas categorias.

## Contrato e persistência

- `GET /api/v1/transactions`: filtros `year`, `month`, `type`, `category_id`,
  `status`, `search`, `page` e `limit` (o frontend usa oito registros por página).
- A resposta mantém `data` e `pagination` e acrescenta `summary` e `metadata`.
- `summary` contém os indicadores de todos os resultados filtrados, antes da
  paginação, e `next_pending_date`. Pendências não entram no saldo efetivado.
- `metadata` contém `total_records` do usuário e `available_periods` sem os
  filtros da listagem. Não contém registros nem períodos de outros usuários.
- Dados, totais e metadados são lidos na mesma transação com RLS e isolamento
  Repeatable Read. Não é necessário aplicar uma nova migração.
- `POST /transactions` e `PATCH /transactions/:id` recebem `category_id`,
  `type`, `amount` em reais, `date`, `description` e `status`.
- `DELETE /transactions/:id` retorna 204. O usuário vem exclusivamente do token.

O formulário converte BRL para o número de reais aceito pela API; a apresentação
usa centavos inteiros. Valores monetários retornados são validados contra o limite
seguro de precisão do JavaScript. Datas financeiras permanecem `YYYY-MM-DD`.
Erros de categoria alheia/incompatível são associados ao campo de categoria.

## Interface

A listagem abre em todo o período, incluindo os dados de apresentação de 2024.
O filtro de meses é preenchido pelo histórico real, incluindo o mês atual e o
selecionado. Criação sem mês selecionado usa a data atual. Depois de salvar, a
interface seleciona o mês da transação e limpa os outros filtros. Depois de excluir,
preserva filtros; páginas fora do intervalo são ajustadas pelo servidor.

A busca espera 250 ms antes da consulta e cancela a chamada anterior. Usa a regra
do backend: trecho literal, sem distinção de caixa, com acentos significativos.
O campo aceita até 100 caracteres. O formulário aceita descrição de até 300
caracteres e datas a partir de 1900; filtros de período aceitam 1900 a 9998.
Cancelar uma chamada não garante reversão de uma escrita já executada no servidor.

## Validação

Em `frontend`: `npm run build`, `npm run lint` e `npm test`.
Em `backend`: `npm run typecheck` e `npm test`.

Para executar o fluxo HTTP com banco temporário, inicie `npm run dev:local` em
`backend` e execute em `frontend`:

```bash
TRANSACTION_API_INTEGRATION_URL=http://127.0.0.1:3002/api/v1 npx vitest run tests/transactionApi.integration.test.ts
```

O teste exige uma API loopback com `X-Local-Demo: true`; não usa o Supabase.
Verifica criação, releitura, edição, exclusão, paginação, totais fora da página,
pendências, categoria incompatível e isolamento entre duas contas. Os registros
criados pelo teste são removidos ao terminar. Sem a variável, o teste é ignorado
na suíte padrão. Os testes E2E antigos ainda pressupõem a demonstração simulada.

Para conferir no navegador, entre no frontend, abra Transações, crie uma pendência,
recarregue, filtre pelo mês/categoria, efetive pela edição e exclua. Verifique também
que uma categoria recém-criada na tela Categorias aparece no formulário e que outra
conta não vê os lançamentos. Voltar ao dashboard ou recarregar o relatório consulta
os totais atualizados para o período selecionado.
