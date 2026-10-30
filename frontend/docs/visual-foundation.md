# Fundação visual — Etapa 2

## Origem e prioridade

Tokens extraídos dos cinco `code.html` de `references/stitch_controle_financeiro_mvp_prototype/` e conferidos com seus `screen.png`. O `controle_financeiro_precision/DESIGN.md` é complementar: sua descrição textual diverge dos HTMLs em cores e raios. As referências permanecem intactas.

## Organização

- `src/styles/tokens.css`: cores semânticas, tipografia, espaçamentos, raios, sombras, breakpoints e dimensões estruturais. `@theme static` expõe variáveis CSS e utilitários Tailwind.
- `src/styles/global.css`: fonte local, base global, foco, seleção, movimento reduzido e utilitário `financial-figure`.
- `src/index.css`: ponto de entrada dos estilos.
- `src/App.tsx`: amostra estática para revisão; não é uma página funcional ou um dashboard.

## Valores consolidados

| Grupo | Decisão |
| --- | --- |
| Fundo / superfície | `#FAF8FF` / `#FFFFFF` |
| Superfícies secundárias | `#F2F3FF`, `#EAEDFF`, `#E2E7FF` |
| Texto / secundário | `#131B2E` / `#434655` |
| Ação / destaque | `#004AC6` / `#2563EB` |
| Receita / despesa | `#006E2D` / `#AE0010` |
| Pendência | Texto `#92400E` sobre `#FEF3C7`, seguindo a referência de transações |
| Erro | `#BA1A1A`, fundo `#FFDAD6`, texto `#93000A` |
| Fonte | Inter variável, normal, pesos 100–900, `font-display: swap` |
| Texto | 14/20 px; secundário 12/16 px; texto amplo 16/24 px |
| Títulos | 20/28, 24/32 e 32/40 px |
| Métricas | 28/36 px, peso 700, números tabulares quando aplicável |
| Espaçamentos | Base 4 px; tokens de 4, 8, 16, 24 e 32 px |
| Raios | Controle 4 px, cartão 8 px, avatar 12 px |
| Sombras | Cartão suave; popover e diálogo com elevação progressiva |
| Breakpoints | 640, 768, 1024 e 1280 px |
| Estrutura futura | Sidebar 256 px, cabeçalho 64 px, conteúdo máximo 1440 px |
| Margem responsiva | 16 px, 24 px a partir de 768 px, 32 px a partir de 1024 px |

Os nomes `control`, `card` e `avatar` evitam a ambiguidade dos nomes de raio do Stitch. Não sobrescrevemos `rounded-full` do Tailwind com os 12 px da exportação: círculos reais continuam possíveis.

## Uso

Exemplos: `bg-canvas`, `bg-surface`, `text-ink`, `text-income`, `text-expense`, `text-metric`, `rounded-card`, `shadow-card`, `p-space-lg` e `financial-figure`. CSS tradicional pode usar as mesmas variáveis com `var(...)`.

A fonte vem de `@fontsource-variable/inter` (OFL-1.1), com apenas o arquivo WOFF2 latino referenciado no build. Não há chamada ao Google Fonts. `financial-figure` alinha números; a formatação dinâmica de valores e datas será implementada nas etapas funcionais.

## Acessibilidade e limites

- Foco visível de 2 px com afastamento de 3 px.
- Texto descritivo acompanha cores financeiras na prévia.
- Preferência por movimento reduzido respeitada globalmente.
- Scrollbars preservadas; sem reprodução dos recortes da exportação.
- Tema claro nesta etapa; nenhuma interface escura foi aprovada.
- A prévia valida composição a partir de 320 px, sem substituir a futura revisão das telas.

Botões, campos, cards e feedback reutilizáveis serão criados na etapa 3 conforme a necessidade. Não há rotas, serviços, mocks ou autenticação nesta entrega.

## Validação realizada

- `npm run build`: aprovado, incluindo a checagem TypeScript; um único WOFF2 latino de 48,25 kB emitido.
- `npm run lint`: aprovado, sem avisos.
- Edge headless com Playwright disponível no ambiente, sem dependência de testes adicionada: larguras 320, 375, 768 e 1440 px sem overflow horizontal.
- Fonte local carregada; fundo `rgb(250, 248, 255)`; título 24 px no mobile e 32 px a partir de 768 px.
- Navegação Tab com foco visível e preferência por movimento reduzido verificadas; sem erros JavaScript de página.
- Screenshots de 375 e 1440 px inspecionados visualmente, armazenados somente no diretório temporário do ambiente.

Esta conferência cobre a fundação e a prévia. Não representa comparação integral com as telas do Stitch, que ainda serão implementadas, nem auditoria completa de acessibilidade.
