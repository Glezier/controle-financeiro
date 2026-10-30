# Controle Financeiro — Frontend

Interface do MVP acadêmico de controle financeiro pessoal, independente de `backend/`.

## Estado atual

Etapa 5: autenticação visual e dashboard funcional com dados simulados, indicadores, pendências, despesas por categoria, transações recentes e modal de criação. Transações, Categorias e Relatórios ainda exibem espaços reservados; a amostra de componentes está em `/componentes` após entrar.

Consulte as decisões e os valores em [Fundação visual](docs/visual-foundation.md).
Veja as rotas, os componentes e as verificações em [Layout compartilhado](docs/shared-layout.md).
O fluxo atual está em [Autenticação visual](docs/authentication.md); expectativas da integração estão no [Contrato provisório](docs/api-contract.md).
Veja regras, dados e cenários de revisão em [Visão Geral](docs/dashboard.md).

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

## Estrutura inicial

```text
frontend/
├── docs/
│   ├── api-contract.md
│   ├── authentication.md
│   ├── dashboard.md
│   ├── shared-layout.md
│   └── visual-foundation.md
├── src/
│   ├── app/
│   ├── components/
│   │   ├── dashboard/
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
│   │   ├── components.css
│   │   ├── dashboard.css
│   │   ├── global.css
│   │   ├── layout.css
│   │   └── tokens.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── tests/
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
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

A interação das telas é verificada com o Playwright disponível no ambiente, sem adicioná-lo às dependências. Não há autenticação real, integração HTTP ou persistência financeira nesta etapa.

## Limites e próxima etapa

- `references/` é somente leitura; as exportações do Stitch orientam o visual.
- Documentação e schema prevalecem sobre comportamentos demonstrativos inconsistentes.
- Metadados visuais extras de categoria serão provisórios, sem mudanças no backend.
- Exportação PDF/CSV, recuperação de senha, orçamento e reserva estão fora do escopo funcional inicial.
- Dados seguirão páginas/componentes → serviços assíncronos → mocks, depois API. Páginas não importarão mocks diretamente.
- A etapa 6, Transações, depende de aprovação após revisão da Visão Geral.
