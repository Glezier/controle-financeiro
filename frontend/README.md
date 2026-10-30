# Controle Financeiro — Frontend

Interface do MVP acadêmico de controle financeiro pessoal, independente de `backend/`.

## Estado atual

Etapa 2: configuração inicial e fundação visual concluídas. A aplicação exibe uma amostra estática de cores, superfícies, tipografia e números para revisão. Telas funcionais, layout compartilhado, rotas, serviços e mocks ficam para as próximas etapas aprovadas.

Consulte as decisões e os valores em [Fundação visual](docs/visual-foundation.md).

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

## Estrutura inicial

```text
frontend/
├── docs/
│   └── visual-foundation.md
├── src/
│   ├── styles/
│   │   ├── global.css
│   │   └── tokens.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Dependências e decisões

- React e React DOM: renderização e componentes.
- TypeScript e tipos de React/DOM/Node: tipagem da aplicação e das configurações. TypeScript 6 atende ao suporte declarado pelo typescript-eslint adotado.
- Vite e plugin React: desenvolvimento, transformação de TSX e build.
- Tailwind CSS e plugin Vite: estilos compilados, sem CDN, com tokens CSS semânticos.
- @fontsource-variable/inter: fonte Inter local, com somente o arquivo latino referenciado no build.
- ESLint, @eslint/js, typescript-eslint, plugins de hooks/React Refresh e globals: análise estática do código e das configurações.

React Router, Zod, testes e ferramentas adicionais de formatação serão instalados somente quando necessários. Ainda não há testes automatizados: esta etapa não implementa comportamentos de domínio ou formulários.

## Limites e próxima etapa

- `references/` é somente leitura; as exportações do Stitch orientam o visual.
- Documentação e schema prevalecem sobre comportamentos demonstrativos inconsistentes.
- Metadados visuais extras de categoria serão provisórios, sem mudanças no backend.
- Exportação PDF/CSV, recuperação de senha, orçamento e reserva estão fora do escopo funcional inicial.
- Dados seguirão páginas/componentes → serviços assíncronos → mocks, depois API. Páginas não importarão mocks diretamente.
- A etapa 3, layout compartilhado, depende de aprovação após revisão da fundação visual.
