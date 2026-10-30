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

Códigos atuais: `validation`, `invalid_credentials`, `email_exists`, `unavailable` e `cancelled`. Nomes de campos, mensagens e mapeamento de respostas HTTP são provisórios. `simulateFailure` e `demoAccess` existem somente para demonstração e não fazem parte de uma API futura.

A confirmação de senha e `acceptedDemo` pertencem apenas à interface. Nenhuma senha ou token é retornado no perfil. Não há definição de JWT, refresh token, cookies, headers de autenticação ou persistência no cliente nesta etapa.

## Pontos para alinhamento na integração

- URLs, métodos HTTP e payloads reais de autenticação.
- Limites de nome, e-mail e senha, atualmente escolhas provisórias do cliente.
- Fonte do nome de exibição e identificador do usuário.
- Confirmação de cadastro/e-mail e tratamento de sessão expirada.
- Transporte, renovação e encerramento de sessão conforme a arquitetura do backend.
- Normalização de erros globais e por campo.

Os demais domínios serão acrescentados quando suas etapas forem implementadas. A futura URL da API será configurada por variável de ambiente com `.env.example` quando houver chamadas HTTP. Nenhuma URL privada ou credencial real é necessária para a simulação atual.
