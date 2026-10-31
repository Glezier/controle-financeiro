# Controle Financeiro — Frontend

Interface do MVP acadêmico de controle financeiro pessoal, independente de `backend/`.

## Estado atual

Etapa 10: implementação e validação do frontend com dados simulados concluídas. Login/cadastro, dashboard, transações, categorias e relatórios possuem serviços separados, componentes reutilizáveis e testes. Categorias em uso mantêm exclusão e troca de tipo bloqueadas; a amostra de componentes está em `/componentes` após entrar.

Consulte as decisões e os valores em [Fundação visual](docs/visual-foundation.md).
Veja as rotas, os componentes e as verificações em [Layout compartilhado](docs/shared-layout.md).
O fluxo atual está em [Autenticação visual](docs/authentication.md); expectativas da integração estão no [Contrato provisório](docs/api-contract.md).
Veja regras, dados e cenários de revisão em [Visão Geral](docs/dashboard.md).
Veja filtros, edição, exclusão e cenários de revisão em [Transações](docs/transactions.md).
Veja regras de integridade, formulário e cenários em [Categorias](docs/categories.md).
Veja períodos, gráficos e cenários em [Relatórios](docs/reports.md).
Veja achados, correções e verificações em [Revisão geral](docs/general-review.md).
Veja resultados, reprodução dos testes, comparação visual e ressalvas em [Testes e validação](docs/validation.md).

Acesso fictício: `lucas.mendes@email.com` / `12345678`. A aplicação abre em `/login`. Cadastros, sessão e lançamentos simulados são reiniciados ao recarregar a página; use apenas dados fictícios. O dashboard inicia em outubro de 2024, conforme a referência.

## Requisitos e execução

Node.js conforme `engines` do package.json: `^20.19.0 || ^22.13.0 || >=24`; npm. Ambiente utilizado: Node.js 20.20.2 e npm 10.8.2.

Na raiz do repositório:

```powershell
cd frontend
npm ci
npm run dev
```

Abra a URL exibida pelo Vite (normalmente http://localhost:5173). O backend e variáveis de ambiente não são necessários nesta etapa.

## Comandos

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com atualização automática |
| `npm run typecheck` | Verificação TypeScript sem emitir código |
| `npm run lint` | Análise estática, sem avisos permitidos |
| `npm run build` | Verificação TypeScript e build em `dist/` |
| `npm run preview` | Prévia local; requer build anterior |
| `npm test` | Testes de autenticação, validação financeira e serviços simulados |
| `npm run test:watch` | Testes em modo de observação |
| `npm run test:e2e` | Build de produção e testes de navegador; requer Chromium do Playwright ou canal instalado |

## Estrutura

```text
frontend/
├── docs/
│   ├── api-contract.md
│   ├── authentication.md
│   ├── categories.md
│   ├── general-review.md
│   ├── validation.md
│   ├── pull-request.md
│   ├── reports.md
│   ├── dashboard.md
│   ├── shared-layout.md
│   ├── transactions.md
│   └── visual-foundation.md
├── src/
│   ├── app/
│   ├── components/
│   │   ├── dashboard/
│   │   ├── categories/
│   │   ├── reports/
│   │   ├── feedback/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── transactions/
│   │   └── ui/
│   ├── pages/
│   ├── hooks/
│   ├── mocks/
│   ├── services/
│   ├── utils/
│   ├── routes/
│   ├── types/
│   ├── styles/
│   │   ├── auth.css
│   │   ├── categories.css
│   │   ├── reports.css
│   │   ├── components.css
│   │   ├── dashboard.css
│   │   ├── global.css
│   │   ├── layout.css
│   │   ├── transactions.css
│   │   └── tokens.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── tests/
│   └── e2e/
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.e2e.json
└── README.md
```

## Dependências e decisões

- React e React DOM: renderização e componentes.
- React Router DOM: rotas, redirecionamento inicial e navegação com estado ativo.
- TypeScript e tipos de React/DOM/Node: tipagem da aplicação e das configurações. TypeScript 6 atende ao suporte declarado pelo typescript-eslint adotado.
- Vite e plugin React: desenvolvimento, transformação de TSX e build.
- Tailwind CSS e plugin Vite: estilos compilados, sem CDN, com tokens CSS semânticos.
- @fontsource-variable/inter: fonte Inter local, com somente o arquivo latino referenciado no build.
- ESLint, @eslint/js, typescript-eslint, plugins de hooks/React Refresh e globals: análise estática do código e das configurações.
- Zod: validação de formulários e entradas dos serviços de autenticação/transações.
- Vitest 4: testes de validação e serviços simulados, incluindo valores financeiros, cancelamento e sessão.
- @playwright/test 1.62.1 (desenvolvimento): testes reproduzíveis de rotas, formulários, fluxos financeiros, teclado e responsividade no build de produção.

A suíte conta com 84 testes Vitest e 24 testes Playwright aprovados. Para preparar Chromium ou usar Edge/Chrome instalado, consulte [a reprodução dos testes](docs/validation.md). Os artefatos gerados ficam fora dos commits. A auditoria de produção está sem alertas; a ressalva moderada do tooling de lint está registrada no mesmo documento. Não há autenticação real, integração HTTP ou persistência financeira nesta entrega.

## Limites e próxima etapa

- `references/` é somente leitura; as exportações do Stitch orientam o visual.
- Documentação e schema prevalecem sobre comportamentos demonstrativos inconsistentes.
- Metadados visuais extras de categoria são provisórios, sem mudanças no backend.
- Exportação PDF/CSV, recuperação de senha, orçamento e reserva estão fora do escopo funcional inicial.
- Dados seguem páginas/componentes → serviços assíncronos → mocks. Na integração, os serviços passarão a acessar a API; páginas não importam mocks diretamente.
- Após aprovação desta entrega, os próximos passos de publicação são push da branch e abertura do PR. A descrição sugerida está em [pull-request.md](docs/pull-request.md).
