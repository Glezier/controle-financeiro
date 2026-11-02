# Relatórios — etapa 8

## Entrega

Rota protegida `/relatorios`: filtro por mês de referência e intervalo, três indicadores efetivados, evolução mensal, distribuição de despesas por categoria, taxa de resultado e pendências separadas. Exportação PDF/CSV, orçamento e reserva financeira permanecem fora do escopo funcional; não há botões que aparentem concluir essas operações.

Fluxo: página/componentes → `reportService` → adaptador de mocks compartilhado com transações e categorias. `useReport` cancela consultas obsoletas e deriva o carregamento imediatamente ao mudar os filtros, sem mostrar totais anteriores com um novo período. Não há importação de mocks nas páginas, novas dependências ou alterações no backend/referências.

`FinancialSummary` recebe uma variante de apresentação para Relatórios; `ExpensesChart` aceita um título. O cálculo de distribuição é compartilhado com o dashboard em `financialSummary.ts`. Os gráficos utilizam SVG nativo; a evolução possui tabela expansível com valores exatos e a distribuição tem legenda com categoria, percentual e valor.

## Períodos e regras

- Inicial: outubro de 2024, para acompanhar os dados fictícios existentes. O controle usa “Mês selecionado”, sem afirmar que se trata do mês atual.
- Mês: indicadores e categorias refletem somente o mês escolhido. Evolução mostra esse mês e até três anteriores como contexto, explicitamente identificado na tela.
- Últimos 3 meses: intervalo móvel terminado no mês de referência, incluindo o próprio mês. Não é trimestre civil.
- Ano: janeiro a dezembro do ano de referência, com todos os doze meses, mesmo sem lançamentos. O mês de referência permanece explícito no controle.
- Alterar o campo e aplicar, ou escolher um intervalo, valida e aplica o mês informado. Filtros ficam na URL (`period` e `range`) e permitem navegação pelo histórico. Entradas inválidas da URL são normalizadas; o formulário mostra erro para mês ausente/inválido.
- Datas são agrupadas por strings `YYYY-MM`, sem deslocamento de fuso. No limite inferior do calendário, o contexto e a janela móvel são reduzidos aos meses disponíveis a partir de 0001-01.
- Saldo = receitas efetivadas menos despesas efetivadas. Pendências não entram nos indicadores, barras ou distribuição; valores e contagem pendentes aparecem em bloco separado.
- Taxa de resultado = saldo/receitas efetivadas. Pode ser negativa; sem receitas, fica indisponível, sem `NaN`, infinito ou percentual inventado.
- Meses sem receitas/despesas efetivadas têm valores zero. Um mês sem lançamentos pode ter contexto anterior no gráfico; isso é informado. Uma janela inteira sem efetivações exibe mensagem própria e mantém a tabela de zeros disponível.
- Distribuição soma despesas efetivadas por categoria; total, percentuais e nomes acompanham os lançamentos e as categorias atuais.
- Os dados permanecem em memória, isolados por conta demonstrativa, e reiniciam ao recarregar. O e-mail do mock não é um mecanismo de autorização da API real.

## Valores de referência

| Intervalo | Receitas efetivadas | Despesas efetivadas | Resultado |
| --- | --- | --- | --- |
| Outubro/2024 | R$ 5.800,00 | R$ 2.379,50 | R$ 3.420,50 |
| Setembro/2024 | R$ 5.000,00 | R$ 1.870,00 | R$ 3.130,00 |
| Agosto–Outubro/2024 | R$ 10.800,00 | R$ 4.249,50 | R$ 6.550,50 |
| Ano 2024 | R$ 10.800,00 | R$ 4.249,50 | R$ 6.550,50 |

Outubro possui R$ 350,00 de despesas pendentes, fora desses totais. Julho e agosto não receberam lançamentos adicionais apenas para preencher as barras do Stitch.

## Revisão manual

Execute `npm run dev` em `frontend/` e entre com `lucas.mendes@email.com` / `12345678`.

1. Abra Relatórios e compare outubro com os valores acima e com o dashboard. Expanda Ver valores mensais para conferir o contexto de julho a outubro.
2. Selecione Últimos 3 meses e Ano selecionado; confira os totais e as três/doze linhas da tabela. Teste o histórico do navegador.
3. Aplique setembro, novembro e um ano sem lançamentos. Novembro fica zerado nos indicadores e categorias, mas mostra setembro/outubro como contexto. Um ano vazio mostra estados sem dados e a tabela mensal de zeros.
4. Limpe o mês e aplique: deve aparecer mensagem associada ao campo, mantendo o relatório aplicado anteriormente.
5. Crie ou edite uma transação em Transações e volte a Relatórios. Efetivadas alteram os indicadores; pendentes ficam apenas no resumo de pendências.
6. Renomeie uma categoria em Categorias e confira a identificação no gráfico, sem alteração do saldo.
7. Após entrar, abra `/relatorios?period=2024-10&range=month&cenario=erro`; Tentar novamente remove o cenário e refaz a leitura.
8. Confira teclado nos filtros, tabela expansível e rolagem dos gráficos/tabelas. Em espaço estreito, gráficos curtos iniciam nos meses recentes; o gráfico anual preserva a ordem cronológica e permite rolagem horizontal.

## Referência e verificação

Comparação com `relat_rios_indicadores_e_gr_ficos/screen.png` usando capturas temporárias do Edge headless/Playwright disponível no ambiente. SVGs corrigem recortes e barras defeituosas; não há biblioteca nova de gráficos ou screenshots versionados.

Diferenças intencionais: períodos funcionais e explícitos; nomes e contagens coerentes com o conjunto compartilhado; meses sem dados zerados; tabela de valores exatos; seleção de qualquer mês/ano; resumo de pendências e taxa real em lugar de alegações sobre bolsas, superávit consecutivo ou reserva. A distribuição reutiliza a apresentação e as cores das categorias. Exportação e orçamento foram omitidos. Marca e ícones permanecem SVG locais íntegros.

Execute `npm test`, `npm run lint` e `npm run build`. Testes de relatórios cobrem intervalos, viradas de ano/calendário, totais e percentuais, centavos, vazio/pendências, resultado negativo, atualização por CRUD, isolamento, cancelamento e erros recuperáveis. O [contrato](api-contract.md) permanece provisório.

Resultado desta entrega: 84 testes aprovados (12 novos de relatórios), build com TypeScript e lint sem erros. Navegador validado em 320, 375, 768, 1024, 1280 e 1440 px, sem rolagem horizontal da página ou corte de indicadores. Passaram filtros, histórico, ausência de totais obsoletos ao carregar, vazio/erro/repetição, integração com criação de transação, tabela mensal, foco ao aplicar por Enter, rolagem por teclado, nome de categoria com 80 caracteres e valor monetário máximo em 320 px, além da escala com valores de centavos.

A revisão da etapa 9 está documentada em [Revisão geral](general-review.md), incluindo o ajuste de disposição dos indicadores em larguras intermediárias.
