# Dashboard e relatórios com dados reais

Dashboard e relatórios agora acessam a API com o token da sessão. Os totais e a
evolução mensal são calculados pelo banco e respeitam RLS. As fábricas de serviços
com mocks permanecem disponíveis para os testes isolados; as instâncias utilizadas
pela aplicação não usam os lançamentos simulados.

## Dashboard

Usa `GET /api/v1/transactions?year=...&month=...&limit=6&page=1` para obter as seis
transações recentes, indicadores do período inteiro, primeira data pendente e meses
disponíveis. `GET /api/v1/categories` fornece os nomes e ícones atuais das categorias.
A distribuição usa `expenses_by_category` do resumo calculado pelo servidor.

O mês inicial é o mês atual. Para apresentar a conta do Lucas, selecione outubro de
2024 ou abra `/visao-geral?period=2024-10`. O atalho Nova Transação abre o cadastro
real na tela de transações. Retornar ao dashboard carrega novamente os indicadores.

## Relatórios

- Totais e distribuição: `GET /api/v1/reports/categories?start_date=...&end_date=...`.
- Série mensal: `GET /api/v1/reports/monthly?start_date=...&end_date=...`.
- Categorias: `GET /api/v1/categories` para apresentar nomes e ícones atualizados.

O modo mensal consolida somente o mês selecionado, mas o gráfico mostra esse mês
e até três anteriores. Últimos 3 meses é uma janela móvel terminando no mês
selecionado; Ano selecionado cobre janeiro a dezembro. Meses vazios são devolvidos
pelo servidor com valores e contagens zero. A API mensal acrescenta
`transaction_count` a cada mês sem exigir alterações nas migrações existentes.

A interface aceita períodos entre janeiro/1900 e dezembro/9998. No limite inferior,
o contexto anterior é limitado a janeiro/1900. Datas de fim de mês, incluindo
fevereiro bissexto, são calculadas em UTC para formar intervalos inclusivos.

Saldo e gráficos usam apenas lançamentos `paid`. Valores e contagens pendentes
ficam separados. A distribuição ignora categorias com despesa efetivada zero.
Taxa de resultado é saldo dividido pela receita efetivada; sem receita, é `null`.
Somente conversões de moeda/unidade, percentuais de apresentação e rótulos são
calculados no frontend; não há recálculo local das agregações financeiras.

Totais, série mensal e categorias são solicitados em paralelo. Cada resposta é
lida em uma transação isolada no backend, mas as três chamadas não compartilham
um único snapshot: em caso de alterações concorrentes, atualize a página para
recarregar os dados. Respostas incompatíveis e falhas de rede mostram erro, sem
substituir dados indisponíveis por zeros fictícios.

## Verificação

Em `frontend`: `npm run build`, `npm run lint` e `npm test`.
Em `backend`: `npm run typecheck` e `npm test`.

Para verificar o fluxo real de HTTP com banco temporário, inicie `npm run dev:local`
em `backend`. Em outro terminal, em `frontend`:

```bash
REPORT_API_INTEGRATION_URL=http://127.0.0.1:3002/api/v1 npx vitest run tests/reportApi.integration.test.ts
```

O teste exige `X-Local-Demo: true` em uma URL loopback e não acessa o Supabase.
Confere os totais da demonstração, meses vazios, ano, janela móvel atravessando anos,
exclusão de pendências do saldo, atualização após efetivação/exclusão, renomeação de
categoria e isolamento entre duas contas. Sem a variável, é ignorado na suíte padrão.

No navegador, selecione outubro/2024 na conta do Lucas e confira o saldo inicial
de R$ 3.420,50 (se os lançamentos da apresentação não tiverem sido alterados).
Crie ou edite uma transação, volte ao dashboard e compare o relatório do mesmo mês.
Teste também uma conta sem lançamentos. A suíte E2E antiga ainda precisa ser
adaptada: suas expectativas foram escritas para a demonstração anterior com mocks.
