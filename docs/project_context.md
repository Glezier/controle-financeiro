# Project Context — Sistema de Controle Financeiro

## Objetivo e prazo
Aplicação web para controle financeiro pessoal, conforme o Projeto 2 de Gerência de Projeto de Software (UFMA). Priorizar MVP funcional, seguro, testado e implantado.

## Stack definida para implementação
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express e TypeScript.
- Supabase: PostgreSQL, Auth e Row Level Security (RLS)
- Zod para validação; Vitest para regras de negócio
- Vercel para deploy; GitHub para versionamento
- API REST com Express e TypeScript.
- Prisma ORM para acesso ao PostgreSQL hospedado no Supabase.
- Migrações versionadas com Prisma Migrate, incluindo SQL para constraints e RLS quando necessário.
- Supabase Auth para autenticação.
- Banco de dados acessado exclusivamente pelo backend.

## Funcionalidades obrigatórias
1. Cadastro, login e logout; bloquear credenciais inválidas
2. CRUD de receitas e despesas: valor, data, descrição, categoria e status (efetivada/pendente)
3. CRUD de categorias próprias, separadas por tipo (receita/despesa)
4. Histórico com busca e filtros por mês/ano, categoria, tipo e status
5. Dashboard com saldo disponível, receitas e despesas
6. Relatórios com gastos por categoria e evolução financeira mensal
7. Layout responsivo para desktop e dispositivos móveis

## Modelo de dados
- `auth.users`: usuários gerenciados pelo Supabase Auth; não armazenar senhas em tabelas próprias
- `categories`: `id uuid PK`, `user_id uuid FK -> auth.users`, `name text`, `type text`, `created_at timestamptz`
- `transactions`: `id uuid PK`, `user_id uuid FK -> auth.users`, `category_id uuid FK -> categories`, `type text`, `amount numeric(12,2)`, `date date`, `description text`, `status text`, `created_at timestamptz`
- `type`: `income` ou `expense`; `status`: `paid` ou `pending` (paid = efetivada, inclusive receita recebida)
- Constraints: valor > 0; tipos/status válidos; categoria do mesmo usuário e tipo da transação; categoria vinculada não pode ser excluída
- Índices para `user_id`, data, categoria e filtros frequentes; unicidade de categoria por usuário/tipo/nome quando apropriado
- RLS obrigatório em `categories` e `transactions` para SELECT/INSERT/UPDATE/DELETE por proprietário; validar vínculo de categoria também no banco
- Criar esquema via migrações SQL versionadas; não editar produção manualmente sem migração

## Regras de negócio
- Saldo disponível = soma das receitas `paid` - soma das despesas `paid`; pendências não entram no saldo disponível
- Não armazenar saldo derivado; calcular agregações no banco ou servidor
- Relatórios e filtros devem refletir exatamente os lançamentos e período selecionados
- Todas as operações exigem usuário autenticado e respeitam isolamento de dados
- Valores em BRL, datas apresentadas em pt-BR; persistir data financeira como `date` para evitar deslocamento de fuso
- Validar dados no servidor e no banco; não confiar apenas na interface

## Arquitetura

- Frontend e backend separados, comunicando-se por API REST via HTTPS e JSON.
- Backend organizado em rotas, controllers, services e camada de acesso a dados.
- Regras de negócio e validações sensíveis executadas no backend.
- Banco de dados acessado exclusivamente pelo backend.
- Credenciais e segredos armazenados em variáveis de ambiente.
- Rotas privadas protegidas por middleware de autenticação JWT.
- Operações financeiras restritas aos dados do usuário autenticado.

## Telas mínimas
Login/cadastro; dashboard; listagem e formulário de transações; gerenciamento de categorias; relatórios.

## Fora do escopo
Integração/importação automática bancária, transferências/pagamentos reais, documentos fiscais, investimentos, aplicativo nativo e manutenção contínua após a entrega acadêmica.

## Qualidade e entrega
- Testar autenticação, CRUD, isolamento entre usuários, saldo com pendências, filtros, gráficos, responsividade e exclusão de categorias em uso
- Nenhuma falha impeditiva aberta na entrega; registrar evidências dos testes
- Entregar DER/MER, documentação de requisitos e arquitetura, README de execução, código versionado, deploy funcional e documentação acadêmica/aceite
- Fluxo incremental: banco + RLS -> autenticação -> categorias -> transações -> saldo/filtros -> gráficos -> testes -> deploy

## Diretrizes de colaboração
Implementar passo a passo, explicando decisões e alterações pontuais; não gerar o projeto inteiro sem solicitação. Antes de alterar escopo ou arquitetura, discutir impacto. Este arquivo orienta a implementação; o PDF do Projeto 2 é a referência original para requisitos acadêmicos.