# Autenticação visual — Etapa 4

## Interface e fluxo

`/login` e `/cadastro` compartilham o cartão de autenticação baseado no Stitch, sem sidebar. A navegação segmentada usa links reais, indicação da rota ativa e títulos de documento. Login, cadastro, senha/confirmar senha visíveis ou ocultas, erros por campo e feedbacks de sucesso/falha estão disponíveis.

O acesso demonstrativo é `lucas.mendes@email.com` com senha fictícia `12345678`, já preenchidos no login inicial. Também é possível cadastrar uma conta fictícia e entrar com ela enquanto a página não for recarregada. Depois do cadastro, a interface volta ao login com o e-mail normalizado e a senha vazia.

A sessão habilita o layout existente e o perfil correspondente. “Sair” encerra a sessão simulada, inclusive no menu móvel. As páginas financeiras continuam como espaços reservados. A rota originalmente solicitada é preservada quando pertence à lista de destinos internos; endereços externos ou desconhecidos não são usados como redirecionamento.

## Dados e serviços

Fluxo: formulários → contexto/serviços → adaptador de mocks.

- `types/auth.ts`: entradas, resultados discriminados, opções e contrato interno do adaptador.
- `utils/authValidation.ts`: schemas Zod, mensagens de campo e destinos internos permitidos.
- `services/authService.ts`: métodos assíncronos, validação defensiva, latência de 650 ms e normalização de falhas.
- `mocks/auth.ts`: contas e sessão em memória, acesso fictício e comparação demonstrativa de senhas.
- `app/AuthProvider.tsx`, `app/AuthContext.ts`, `hooks/useAuth.ts`: estado compartilhado de preparação, visitante e sessão demonstrativa.
- `hooks/useAuthSubmission.ts`: bloqueio de envios simultâneos, foco no primeiro campo inválido, feedback e cancelamento ao desmontar o formulário.
- `components/forms`: formulários separados e campo de senha reutilizável.
- `pages/AuthPage.tsx` e `styles/auth.css`: composição e apresentação responsiva.

As páginas e componentes não importam mocks diretamente. As credenciais fictícias de apresentação são expostas pelo serviço apenas para a demonstração.

## Limites da simulação

- Não há chamadas ao backend, Supabase, endpoints ou autenticação real.
- Não há persistência em `localStorage`, `sessionStorage`, cookies ou banco. Recarregar reinicia contas e sessão.
- O mock mantém apenas uma impressão SHA-256 da senha em memória para comparar os exemplos; não é uma implementação de autenticação de produção e não define a estratégia futura do servidor.
- Senhas não são incluídas em perfis, URLs, mensagens de erro ou resultados dos serviços.
- A confirmação de senha e a ciência de uso demonstrativo são verificações da interface; não são enviadas ao adaptador.
- As verificações de rota demonstram o fluxo de navegação; isolamento e autorização reais continuam sendo responsabilidade do backend.

## Validação e acessibilidade

Regras provisórias do cliente: e-mail válido com até 254 caracteres, nome entre 2 e 100 caracteres, senha entre 8 e 128 caracteres e confirmação coincidente. Nome/e-mail são normalizados; a senha não é aparada ou alterada. Os limites precisam ser alinhados ao contrato de autenticação real.

Os campos têm labels, autocomplete, indicação de obrigatoriedade, `aria-invalid` e descrições associadas. Os controles de visibilidade têm nomes acessíveis e estado `aria-pressed`. O formulário informa carregamento, desabilita seus campos durante o envio e posiciona o foco no primeiro erro. A saída ou troca de página cancela operações pendentes do formulário. O conteúdo principal recebe foco após entrar ou navegar.

O botão “Simular erro de acesso” percorre o serviço com uma falha explícita de demonstração, sem criar sessão. Credenciais incorretas e e-mail duplicado também produzem respostas simuladas próprias.

## Diferenças intencionais em relação ao Stitch

- Logo substituído por SVG local e controle de senha com ícones SVG.
- Recuperação de senha omitida, conforme escopo aprovado.
- “Lembrar por 30 dias” omitido: a simulação não persiste sessão.
- Texto de confirmação do cadastro descreve o uso demonstrativo, sem afirmar aceite de documentos legais inexistentes.
- Rodapé informa que os dados são fictícios e apagados ao recarregar, sem afirmar segurança de um fluxo real.
- Mensagens de erro usam feedbacks reais na interface, em vez de `alert()`.

## Verificações

`npm test` executa os testes de schemas e serviços no Vitest 4, compatível com o Node 20 deste ambiente. Os testes verificam normalização, limites, confirmação, ciência de demonstração, destinos permitidos, credenciais inválidas, sessão, cadastro/saída, concorrência de cadastro, falha simulada, cancelamento e tratamento de exceções.

As verificações de navegador usam o Playwright já disponível no ambiente, sem adicioná-lo ao projeto. Screenshots e resultados desta etapa são conferidos antes da entrega; os arquivos gerados ficam somente em diretórios temporários.

Resultado desta etapa: 21 testes aprovados, lint sem avisos e build com checagem TypeScript aprovado. Login e cadastro conferidos em 320, 375, 768 e 1440 px, sem overflow horizontal, com screenshots desktop/mobile revisados. Fluxos de login válido/inválido, falha simulada, duplicidade de e-mail, confirmação, perfil após cadastro, saída móvel, cancelamento e reinício da sessão ao recarregar passaram no navegador, sem erros JavaScript de página.

## Próxima etapa

A etapa 5, Visão Geral com dados financeiros simulados e estados de resposta, depende de aprovação. Nenhuma funcionalidade financeira foi antecipada.
