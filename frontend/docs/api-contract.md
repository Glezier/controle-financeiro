# Expectativas provisórias da API

Este documento registra necessidades do frontend; não define endpoints existentes nem impõe alterações ao backend. Na inspeção inicial, o backend expunha apenas `/health` e `/health/db`. O contexto do projeto prevê Supabase Auth e comunicação separada com a API.

## Autenticação

| Operação interna | Entrada necessária | Resultado esperado pelo frontend |
| --- | --- | --- |
| `getSession` | Nenhuma na simulação | Perfil ou ausência de sessão |
| `signIn` | E-mail e senha | Perfil da sessão ou erro tipado |
| `signUp` | Nome, e-mail e senha | Perfil cadastrado ou erro tipado |
| `signOut` | Nenhuma na simulação | Confirmação de encerramento ou falha |

O perfil de apresentação atual contém `name` e `email`. Identificador do usuário, origem do nome no Supabase, confirmação de e-mail e formato de sessão ainda precisam ser acordados. A simulação retorna ao login depois do cadastro; o comportamento real dependerá da confirmação exigida pelo provedor.

O serviço do frontend retorna Promises com `{ ok: true, data }` ou `{ ok: false, error: { code, message, fields? } }`. Este é um formato interno de adaptação, não uma exigência de JSON ou códigos HTTP para o backend.

Códigos atuais: `validation`, `invalid_credentials`, `email_exists`, `unavailable`, `cancelled` e `not_found` (transação ausente no escopo solicitado). Nomes de campos, mensagens e mapeamento de respostas HTTP são provisórios. `simulateFailure` e `demoAccess` existem somente para demonstração e não fazem parte de uma API futura.

A confirmação de senha e `acceptedDemo` pertencem apenas à interface. Nenhuma senha ou token é retornado no perfil. Não há definição de JWT, refresh token, cookies, headers de autenticação ou persistência no cliente nesta etapa.

## Pontos para alinhamento na integração

- URLs, métodos HTTP e payloads reais de autenticação.
- Limites de nome, e-mail e senha, atualmente escolhas provisórias do cliente.
- Fonte do nome de exibição e identificador do usuário.
- Confirmação de cadastro/e-mail e tratamento de sessão expirada.
- Transporte, renovação e encerramento de sessão conforme a arquitetura do backend.
- Normalização de erros globais e por campo.

## Visão geral e criação de transações — etapa 5

O contrato interno provisório está em `types/finance.ts`:

| Operação interna | Entrada atual | Saída necessária para a interface |
| --- | --- | --- |
| `getDashboard` | Proprietário do mock, período `YYYY-MM` | Categorias disponíveis, períodos, resumo efetivado/pendente, seis transações recentes e despesas por categoria |
| `createTransaction` | Proprietário do mock e dados do formulário | Transação criada ou erro global/por campo |

Os nomes, endpoints e verbos HTTP não estão definidos. O formato `FinanceResult` é uma adaptação do frontend, não uma imposição ao JSON da API. Na integração real, o proprietário deverá vir da sessão validada pelo servidor; o e-mail usado para separar os mocks não deverá ser considerado uma autorização.

`Transaction` usa `id`, `categoryId`, `type`, `amountCents`, `date`, `description`, `status` e `createdAt`. `amountCents` representa um inteiro interno do frontend; o campo `amount numeric(12,2)` do backend será convertido pelo adaptador, após alinhamento do formato JSON decimal. Datas financeiras permanecerão `YYYY-MM-DD`, enquanto `createdAt` representa um timestamp.

Categorias têm identificador, nome e tipo. `appearance` (ícone/cor) é metadado demonstrativo opcional; não existe no schema e não exige alteração do backend. Respostas de dashboard e períodos são modelos de apresentação provisórios; a equipe pode disponibilizar agregações no servidor com outro formato, preservando as regras documentadas.

Pendências não entram no saldo disponível nem na distribuição de despesas efetivadas. Categoria obrigatória, do mesmo usuário e tipo, e valor positivo são regras existentes no contexto/schema. O limite de 200 caracteres da descrição é uma decisão provisória do cliente. Contratos de categorias e relatórios serão alinhados em suas etapas.

A futura URL da API será configurada por variável de ambiente com `.env.example` quando houver chamadas HTTP. Nenhuma URL privada ou credencial real é necessária para a simulação atual.

## Gestão de transações — etapa 6

| Operação interna | Entrada atual | Saída necessária para a interface |
| --- | --- | --- |
| `getTransactions` | Proprietário do mock e `TransactionQuery` | Itens com categoria, contagem filtrada, contagem total do usuário, página efetiva, tamanho/total de páginas, resumo de todos os resultados filtrados, categorias e períodos disponíveis |
| `updateTransaction` | Proprietário do mock, UUID e formulário completo | Transação atualizada mantendo `id` e `createdAt`, ou erro global/por campo |
| `deleteTransaction` | Proprietário do mock e UUID | Confirmação interna `{ ok: true, data: null }`, ou erro |

`TransactionQuery` contém período (`YYYY-MM` ou `all`), tipo (`income`, `expense`, `all`), `categoryId` (UUID ou `all`), situação (`paid`, `pending`, `all`), busca por descrição e página. São modelos internos provisórios, não parâmetros HTTP definitivos. A URL da interface utiliza `period`, `type`, `category`, `status`, `q` e `page`.

Os filtros se combinam com AND. A busca trata acentos, caixa e espaços; não interpreta expressões regulares. A ordenação é data financeira decrescente, seguida de criação decrescente e identificador como desempate. A simulação retorna oito itens por página e calcula indicadores sobre todos os resultados filtrados, antes de paginar. Uma página inexistente é ajustada à última disponível; uma lista vazia mantém a página 1. Metadados dos filtros pertencem sempre ao usuário atual.

Edição e exclusão verificam a propriedade do lançamento no adaptador. A edição reaplica as mesmas validações da criação, inclusive compatibilidade de categoria/tipo. Alterar tipo exige escolher uma categoria compatível. `paid` representa despesa paga ou receita recebida; excluir pendência não altera o saldo efetivado. Todos os indicadores do dashboard e da listagem derivam do mesmo conjunto em memória.

Após salvar, a interface seleciona o mês do lançamento e limpa os demais filtros. Após excluir, mantém filtros e ajusta a página quando necessário. Essas decisões da interface não exigem comportamento equivalente do servidor. Cancelar/fechar um modal aborta uma operação simulada ainda na latência; em uma integração real, cancelar a requisição não garante reversão de uma escrita já processada pelo servidor.

Ainda é necessário acordar paginação/ordenação do servidor, normalização da busca, agregações sobre o conjunto filtrado, confirmação de exclusão, tratamento de registros concorrentes e mapeamento de erros/autorização. Nenhum endpoint de transações é presumido como existente ou foi implementado nesta etapa.
