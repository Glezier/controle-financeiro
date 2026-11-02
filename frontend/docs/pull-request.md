# Sugestão de pull request

Base pretendida: `main`. Branch: `frontend-implementation`.

## Título

`feat: implementar frontend do controle financeiro`

## Descrição

Implementa o frontend independente do Controle Financeiro em React e TypeScript, com autenticação visual, Visão Geral, gerenciamento de transações e categorias e relatórios financeiros. As telas seguem as referências do Stitch, com componentes reutilizáveis, layouts responsivos e navegação por teclado.

Transações e categorias compartilham uma camada de serviços assíncronos com dados simulados e isolados em memória. Receitas e despesas efetivadas determinam saldos e gráficos; pendências são apresentadas separadamente. Categorias vinculadas a transações não podem ser excluídas nem mudar de tipo, e a renomeação preserva o histórico. As expectativas de integração com a API permanecem provisórias.

Validação:

- `npm run build` e `npm run lint` aprovados.
- 84 testes Vitest aprovados para validação, serviços, isolamento de dados e regras financeiras.
- 24 testes Playwright aprovados sobre o build de produção no Edge headless.
- Seis telas conferidas em 320, 768 e 1440 px; 19 capturas locais apoiam a comparação visual documentada.
- A suíte E2E verifica exceções JavaScript das páginas.
- Auditoria de dependências de produção sem alertas. A ressalva existente no tooling ESLint/minimatch está documentada em `frontend/docs/validation.md`.

O backend foi preservado. As referências visuais foram utilizadas para consulta e não fazem parte do diff versionado. Autenticação e dados financeiros são simulados e reiniciados ao recarregar a página; a entrega não inclui integração real com a API, autenticação no servidor, exportação PDF/CSV, recuperação de senha, orçamento ou reserva financeira.

Consulte `frontend/README.md` para execução e `frontend/docs/validation.md` para reprodução dos testes, diferenças visuais, artefatos gerados e limitações.
