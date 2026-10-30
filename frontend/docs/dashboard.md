# Visão Geral — Etapa 5

Registro da entrega da etapa 5. Na [etapa 6](transactions.md), a tela de Transações passou a permitir edição e exclusão no mesmo conjunto demonstrativo; o formulário e o cálculo de indicadores são compartilhados. As verificações abaixo registram o resultado original desta etapa.

## Entrega

Dashboard em `/visao-geral`, com saudação do usuário demonstrativo, filtro de mês, saldo do período, receitas e despesas efetivadas, pendências separadas, seis transações recentes, detalhes de leitura e distribuição de despesas por categoria em SVG. O modal “Registrar Nova Transação” cria registros apenas na memória da demonstração e atualiza os indicadores.

As telas completas de Transações, Categorias e Relatórios continuam como espaços reservados. Não há edição/exclusão de transações, exportações, orçamento ou operações financeiras reais nesta etapa.

## Organização

- `types/finance.ts`: categorias, transações, resumo, snapshots e contrato interno do adaptador.
- `mocks/finance.ts`: categorias e lançamentos fictícios isolados por proprietário demonstrativo.
- `services/financeService.ts`: leitura da visão geral e criação assíncrona, validação e tratamento de falhas.
- `utils/financeFormat.ts`: conversão BRL, limite monetário, datas financeiras e períodos.
- `utils/dashboardSummary.ts`: cálculo do snapshot exclusivamente a partir dos lançamentos.
- `utils/transactionValidation.ts`: validação de campos do modal.
- `hooks/useDashboard.ts`: carregamento, erro, cancelamento e atualização por período.
- `components/dashboard`: cards de resumo, tabela recente e gráfico de despesas.
- `components/forms/TransactionForm.tsx`: formulário reutilizável para a próxima etapa.
- `components/transactions/TransactionDetails.tsx`: detalhes sem ações de edição/exclusão.
- `pages/DashboardPage.tsx` e `styles/dashboard.css`: composição e responsividade.

Páginas e componentes recebem dados dos serviços, sem importar mocks. Não foram adicionadas dependências.

## Regras e dados demonstrativos

- Valores internos usam centavos inteiros. Receitas/despesas são positivas; o tipo determina o sinal de apresentação.
- Saldo do período = receitas `paid` menos despesas `paid`. Pendências de receita e despesa são mostradas separadamente e não entram no saldo ou gráfico.
- O gráfico soma exclusivamente despesas efetivadas do mês, sem valores fixos independentes das transações.
- Datas financeiras são strings `YYYY-MM-DD`, exibidas em `DD/MM/AAAA`, sem conversão para o fuso local.
- Transações recentes são ordenadas por data financeira decrescente, com desempate por criação/identificador, limitadas a seis.
- A categoria precisa pertencer ao proprietário demonstrativo e ter o mesmo tipo da transação.
- O mock de Lucas inicia com oito lançamentos em outubro de 2024: receitas R$ 5.800,00, despesas efetivadas R$ 2.379,50, saldo R$ 3.420,50 e despesas pendentes R$ 350,00.
- Setembro possui outro conjunto coerente; agosto inicia vazio. O período inicial é outubro de 2024 para acompanhar a referência, sem afirmar que é o mês atual.
- Novas contas começam sem lançamentos e com seis categorias fictícias próprias para permitir testar o formulário. Essa inicialização pertence somente ao mock, sem pressupor comportamento do backend.
- Registros permanecem na mesma sessão de execução, inclusive ao navegar ou sair/entrar com o mesmo usuário. Recarregar reinicia os dados demonstrativos.

O proprietário dos mocks é identificado pelo e-mail do perfil, porque a autenticação visual ainda não fornece um identificador real. Esse detalhe não define autorização, contrato ou filtro da futura API.

## Formulário e estados

O modal permite receita/despesa, descrição, valor BRL, data, categoria compatível e situação efetivada/pendente. Ao mudar o tipo, a categoria é limpa. Por padrão, a data é a data local atual quando está no período selecionado; caso contrário, o primeiro dia desse período.

Valores aceitam exemplos como `1250`, `1.250,50`, `1250,5` e `R$ 1.250,50`; zero, negativos, notação científica, agrupamentos inválidos e mais de duas casas são rejeitados. O limite máximo por lançamento acompanha `numeric(12,2)`: R$ 9.999.999.999,99. A descrição de até 200 caracteres é um limite provisório da interface.

O envio bloqueia duplicações e campos durante o salvamento, associa mensagens aos campos e foca o primeiro inválido. Erros de serviço mantêm o formulário preenchido para nova tentativa. Cancelar ou fechar desmonta o formulário e cancela a operação pendente. Ao salvar em outro mês, a visão geral passa ao período do novo lançamento.

Carregamento e erro não exibem totais do mês anterior. Há tentativa novamente, valores zerados e mensagens próprias para ausência de transações ou despesas efetivadas. Para revisar o erro demonstrativo, abra `/visao-geral?cenario=erro`; “Tentar novamente” remove a simulação. Para revisar o vazio, selecione agosto de 2024 ou entre com uma conta recém-criada.

## Diferenças intencionais da exportação

- Donut corrigido, com segmentos de verdade, valores e percentuais calculados; legenda textual mantém a informação acessível.
- Categorias aparecem separadas, sem repetir agrupamentos incoerentes com os lançamentos.
- A lista mostra os movimentos mais recentes primeiro; não reproduz a ordem antiga da captura.
- Os títulos e avisos distinguem o período demonstrativo da data atual e não apresentam datas passadas como vencimentos futuros.
- O layout empilha tabela/gráfico abaixo de 1280 px e adapta os cards ao espaço disponível, preservando a rolagem interna da tabela.
- Botões de detalhes são funcionais, sem acrescentar edição/exclusão antes da etapa 6.

## Verificação e próxima etapa

Resultado: build com checagem TypeScript e lint aprovados; 47 testes passaram, sendo 26 de finanças e 21 de autenticação. Os testes cobrem centavos e limites, calendário, valores efetivados/pendentes, agregações por categoria, períodos vazios, compatibilidade de categorias, isolamento dos mocks, cancelamento e falhas recuperáveis.

Edge headless com o Playwright disponível no ambiente: larguras 320, 375, 768, 1024, 1280 e 1440 px sem overflow horizontal da página ou dos indicadores. Também foram conferidos valores máximos em 320, 375, 896, 1024 e 1440 px. Screenshots desktop/mobile, modal e valores grandes foram inspecionados; artefatos permaneceram em diretórios temporários.

Passaram no navegador: períodos e vazio, erro/nova tentativa, detalhes, Tab/Shift+Tab/Escape no modal, foco e rolagem por teclado na tabela, validações, bloqueio de envio duplicado, despesas e receitas pendentes sem alterar o saldo, criação em outro mês, cancelamento sem gravar, recuperação de erro ao salvar preservando os campos e separação entre contas demonstrativas. O aviso de sucesso é exibido somente no período salvo, inclusive ao voltar pelo histórico. Não foram detectados erros JavaScript de página.

A revisão encontrou um rótulo acessível da tabela escapando da área de rolagem. O contêiner compartilhado passou a posicionar seus descendentes e manter o foco visível dentro da área, sem ocultar conteúdo ou desabilitar a rolagem interna.

A implementação da etapa 6 está documentada em [Transações](transactions.md).
