# Testes e validação — etapa 10

## Resultado

Validação em 30/10/2026, com Node.js 20.20.2, Windows e Edge headless, usando o build de produção servido pelo Vite Preview.

| Verificação | Resultado |
| --- | --- |
| `npm run build` | Aprovado: TypeScript da aplicação, configurações e testes; bundle de produção |
| `npm run lint` | Aprovado, sem avisos de lint |
| `npm test` | 84 testes aprovados em sete arquivos |
| `npm run test:e2e` com `PLAYWRIGHT_CHANNEL=msedge` | 24 testes aprovados, um worker, sem retries locais |
| Console JavaScript de página | Nenhuma exceção nos testes E2E |
| Capturas | 19 imagens geradas e anexadas ao relatório local |
| `npm audit --omit=dev` | Zero alertas de produção na consulta realizada |

As etapas de implementação e revisão do frontend com dados simulados estão concluídas. Publicação da branch e abertura do PR são ações posteriores, dependentes de autorização.

## Testes reproduzíveis

`@playwright/test` 1.62.1 foi adicionado somente ao desenvolvimento, com `playwright` e `playwright-core` transitivos. É a versão já utilizada no ambiente de validação. Não houve mudança nas dependências de execução da interface.

Na raiz do projeto:

```powershell
cd frontend
npm ci
npx playwright install chromium
npm test
npm run lint
npm run test:e2e
```

O comando E2E executa o build, inicia sua própria prévia em `127.0.0.1:4173` e encerra o servidor ao terminar. A porta precisa estar livre; um servidor existente não é reutilizado, evitando validar um build antigo.

Para usar Edge ou Chrome já instalado, em vez do Chromium baixado:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm run test:e2e
$env:PLAYWRIGHT_CHANNEL = $null
```

`chrome` também é aceito. Sem a variável, a configuração usa Chromium. A execução registrada nesta entrega utilizou Edge; não foi uma validação de vários navegadores.

Artefatos ficam em `test-results/` e `playwright-report/`, ambos ignorados pelo Git e pelo lint. Para consultar o relatório local após executar: `npx playwright show-report`. Falhas preservam trace e screenshot. Os testes de interface salvam capturas mesmo quando passam; as imagens são evidências de revisão, sem baselines PNG versionados ou igualdade automática de pixels com o Stitch.

## Cobertura de navegador

| Arquivo | Casos | Comportamento verificado |
| --- | --- | --- |
| `auth.spec.ts` | 3 | Rotas protegidas, retorno ao destino solicitado, validação, senha visível/oculta, credenciais inválidas, falha/repetição, logout/histórico, cadastro isolado e reinício da sessão ao recarregar |
| `categories.spec.ts` | 3 | Bloqueio de exclusão/tipo em uso, renomeação refletida nas transações, criação, duplicidade, edição de categoria sem vínculos, confirmação/cancelamento e recuperação de lista vazia |
| `transactions.spec.ts` | 4 | Criação pendente, edição de situação/período, detalhes, exclusão, filtros combinados, busca sem acentos, paginação, histórico, validação/foco, categoria compatível, envio duplicado e cancelamento de gravação |
| `reports.spec.ts` | 6 | Mês/três meses/ano, tabela de valores, período vazio, mês inválido, pendências fora dos totais, dados compartilhados e erro/repetição nas quatro páginas financeiras |
| `interface.spec.ts` | 8 | Seis telas responsivas, labels/IDs/referências ARIA/alt/título principal, indicadores sem corte, modais por teclado, menu móvel, link de salto e recuperação de endereço desconhecido |

Os testes usam a interface e os serviços simulados presentes no bundle, sem importar mocks para a página, injetar registros por módulos internos ou depender de endpoints. Cada teste recebe contexto de navegador e memória novos. O relógio controlado torna determinística a verificação de cancelamento durante uma gravação; não há esperas arbitrárias por tempo para sincronizar consultas. Duas submissões no mesmo turno verificam o bloqueio antes de o React desabilitar o botão.

O projeto TypeScript de E2E inclui DOM e Node, separado do projeto dos testes de serviço. Vitest continua selecionando somente `*.test.ts`; Playwright executa `*.spec.ts`. A geração do Tailwind foi limitada a `src/`, impedindo que texto dos testes acrescente utilitários ao CSS da aplicação.

## Comparação visual com o Stitch

As seis telas foram capturadas em 320, 768 e 1440 px, além do modal de transação em celular. A conferência visual considerou os cinco `screen.png` e respectivos HTMLs em `references/stitch_controle_financeiro_mvp_prototype/`. `controle_financeiro_precision/` contém `DESIGN.md`, sem `screen.png`; seus tokens complementam a referência. As referências permaneceram somente leitura.

| Tela | Resultado da comparação e diferenças intencionais |
| --- | --- |
| Login/cadastro | Cartão central, abas, paleta e tipografia mantidos. Logo SVG íntegro; contornos/placeholder mais legíveis. Recuperação de senha e persistência por 30 dias omitidas; sessão demonstrativa explicitamente volátil. Cadastro validado como estado da mesma composição |
| Visão Geral | Estrutura de navegação, indicadores, faixa de pendências, tabela e distribuição preservadas. Gráfico proporcional funcional, valores/coerência derivados do mesmo conjunto e seis transações mais recentes; data atual no cabeçalho separada do período fictício |
| Transações | Quatro indicadores, filtros e tabela com ações. Labels visíveis, ordenação decrescente, paginação real e exclusão com confirmação. Exportação omitida; nomes/contagens coerentes com os mocks |
| Categorias | Lista e formulário compartilhando o espaço no desktop. Contagens reais, metadados visuais provisórios e exclusão/troca de tipo bloqueadas em uso substituem o comportamento demonstrativo que deixava transações sem categoria |
| Relatórios | Indicadores, barras e donut funcionais. Julho/agosto ficam zerados por não terem lançamentos; contexto mensal explicitamente separado do intervalo dos indicadores. Exportação, orçamento, reserva e alegações sobre bolsas/recursos não existentes omitidos |

Grids empilham ou redistribuem cards em espaços menores; tabelas/gráficos conservam rolagem própria. Ícones não aparecem como texto, não há logos quebrados e os gráficos não reproduzem recortes da exportação. A tabela de categorias em celular exige rolagem horizontal para consultar todas as colunas, conforme o componente de tabela compartilhado.

As verificações DOM e teclado são de acessibilidade básica; não substituem testes com leitores de tela. A revisão ampliada da etapa 9, incluindo contraste e larguras intermediárias, permanece em [general-review.md](general-review.md).

## Ressalva de dependências de desenvolvimento

A auditoria completa retornou 12 alertas moderados propagados pela cadeia ESLint/typescript-eslint, com origem em `minimatch` 10.2.6. O [aviso GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) descreve amplificação de padrões controlados por atacante com `optimizationLevel >= 2` e correção em 11.0.1. Não há entrada da aplicação enviada a esse pacote; ele pertence ao tooling de desenvolvimento. A auditoria de produção retornou zero alertas.

Essa cadeia já existia antes da adição do Playwright. A sugestão automática do npm envolve rebaixamentos de ferramentas e não foi aplicada. Permanece um acompanhamento de atualização compatível do tooling; não se declara a auditoria completa sem alertas. Nenhuma dependência foi forçada a uma versão principal incompatível nesta etapa.

## Estado para publicação

- Branch de trabalho: `frontend-implementation`; base local de revisão: `main`.
- O diff desta entrega está restrito a `frontend/`; backend e referências não fazem parte das alterações.
- Dados, sessão e cadastros continuam em memória. Integração real e autenticação no servidor não fazem parte desta entrega.
- Exportação PDF/CSV, recuperação de senha, orçamento e reserva financeira continuam fora do escopo funcional.
- Relatórios/capturas gerados não entram no commit. A pasta local `references/`, que não continha arquivos versionados, foi removida após a validação por autorização do mantenedor. Sua remoção não altera o diff do PR.
- Texto em português para publicação do PR disponível em [pull-request.md](pull-request.md). Os resultados acima registram a validação realizada antes da publicação.
