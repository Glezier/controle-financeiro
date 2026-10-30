# Controle Financeiro — Frontend

Interface do MVP acadêmico de controle financeiro pessoal, independente de `backend/`.

## Estado atual

Etapa 3: fundação visual, layout responsivo, navegação e componentes compartilhados concluídos. As páginas financeiras exibem espaços reservados; a amostra interativa de componentes está em `/componentes`. Autenticação e funcionalidades financeiras ficam para as próximas etapas aprovadas.

Consulte as decisões e os valores em [Fundação visual](docs/visual-foundation.md).
Veja as rotas, os componentes e as verificações em [Layout compartilhado](docs/shared-layout.md).

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
│   ├── shared-layout.md
│   └── visual-foundation.md
├── src/
│   ├── components/
│   │   ├── feedback/
│   │   ├── forms/
│   │   ├── layout/
│   │   └── ui/
│   ├── pages/
│   ├── routes/
│   ├── types/
│   ├── styles/
│   │   ├── components.css
│   │   ├── global.css
│   │   ├── layout.css
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
- React Router DOM: rotas, redirecionamento inicial e navegação com estado ativo.
- TypeScript e tipos de React/DOM/Node: tipagem da aplicação e das configurações. TypeScript 6 atende ao suporte declarado pelo typescript-eslint adotado.
- Vite e plugin React: desenvolvimento, transformação de TSX e build.
- Tailwind CSS e plugin Vite: estilos compilados, sem CDN, com tokens CSS semânticos.
- @fontsource-variable/inter: fonte Inter local, com somente o arquivo latino referenciado no build.
- ESLint, @eslint/js, typescript-eslint, plugins de hooks/React Refresh e globals: análise estática do código e das configurações.

Zod e ferramentas de testes do projeto serão instalados quando necessários. A interação do layout foi verificada com o Playwright disponível no ambiente, sem adicioná-lo às dependências. Não há autenticação ou validação financeira implementada nesta etapa.

## Limites e próxima etapa

- `references/` é somente leitura; as exportações do Stitch orientam o visual.
- Documentação e schema prevalecem sobre comportamentos demonstrativos inconsistentes.
- Metadados visuais extras de categoria serão provisórios, sem mudanças no backend.
- Exportação PDF/CSV, recuperação de senha, orçamento e reserva estão fora do escopo funcional inicial.
- Dados seguirão páginas/componentes → serviços assíncronos → mocks, depois API. Páginas não importarão mocks diretamente.
- A etapa 4, autenticação visual, depende de aprovação após revisão do layout compartilhado.
