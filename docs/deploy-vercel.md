# Publicação na Vercel

O repositório contém dois projetos Vercel independentes, ambos conectados ao mesmo
GitHub. O PostgreSQL e o Auth continuam no Supabase. Não é necessário mover o banco.
Os arquivos de configuração foram preparados localmente; a publicação e a
verificação das URLs públicas devem ser realizadas pelo painel.

## Antes de importar

Faça commit das configurações e envie a branch ao GitHub. Escolha conscientemente
a Production Branch de cada projeto: use `dev` para publicar a versão integrada
atual, ou `main` depois de integrá-la. Não publique acidentalmente a `main` antiga.
Os dois projetos devem usar a mesma versão integrada do código.

As migrações existentes já foram aplicadas ao Supabase. O build da Vercel somente
gera o Prisma Client; não aplica migrações nem executa seeds automaticamente.
Em futuras alterações de banco, revise e aplique `npm run db:migrate` separadamente
com a conexão adequada, antes de disponibilizar código que dependa delas.

## 1. Backend

No painel, selecione Add New → Project e importe o repositório.

| Campo | Valor |
| --- | --- |
| Project Name | Por exemplo `controle-financeiro-api` (precisa estar disponível) |
| Root Directory | `backend` |
| Framework Preset | Express |
| Node.js Version | 22.x |
| Install Command | `npm ci` (definido no arquivo) |
| Build Command | `npm run generate` (definido no arquivo) |
| Output Directory | Padrão do framework; não configurar `dist` |

`src/index.ts` já exporta a aplicação Express; a plataforma compila TypeScript e
empacota a aplicação como Function. `src/server.ts` continua sendo a entrada local.
`backend/vercel.json` inclui a CA pública em `certs/*.crt` na Function, define
timeout de 30 segundos e região `iad1`, próxima ao banco atual em us-east-1.

Configure estas variáveis para o ambiente Production, copiando os valores do `.env`
local sem aspas externas e sem o prefixo `NOME=` no campo Value:

| Nome | Valor |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL real do banco com `sslmode=verify-full&sslrootcert=certs/prod-ca-2021.crt` |
| `SUPABASE_URL` | URL HTTPS do projeto Supabase |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publishable ou anon do mesmo projeto |
| `CORS_ORIGINS` | Inicialmente `http://localhost:5173`; substituir/incluir a origem pública do frontend no passo 3 |
| `TRUST_PROXY_HOPS` | `1`, para o proxy da Vercel |

`PORT` não é necessária para o deploy. `DATABASE_URL` é exclusiva do backend e não
deve ter prefixo `VITE_`. A senha precisa continuar codificada para URL se tiver
caracteres reservados. Mantenha o pooler de sessão na porta 5432 nesta primeira
publicação; é a conexão validada com a aplicação e suas transações com RLS.

Crie o deploy e aguarde Ready. Copie o domínio de produção estável da API e abra:

```text
https://SEU_BACKEND.vercel.app/health
https://SEU_BACKEND.vercel.app/health/db
```

O esperado é `status: ok` e, no segundo, `database: connected`.
A raiz `/` da API pode retornar 404 porque não foi implementada uma página nela.
Chamadas financeiras sem Bearer token devem retornar 401.

Para que o navegador consiga consumir a API, sua URL de produção precisa estar
acessível ao público. Se aparecer uma tela de login da Vercel, confira Deployment
Protection para esse ambiente; essa proteção da hospedagem é diferente do login
da aplicação. As rotas privadas continuam protegidas pelo Supabase Auth.

## 2. Frontend

Importe o mesmo repositório novamente, como outro projeto:

| Campo | Valor |
| --- | --- |
| Project Name | Por exemplo `controle-financeiro-web` |
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Node.js Version | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Configure `VITE_API_URL` em Production com o domínio estável do backend mais
`/api/v1`, por exemplo `https://SEU_BACKEND.vercel.app/api/v1`.
Não use localhost. O endereço é incorporado ao bundle pelo Vite durante o build;
mudanças nele exigem novo deploy.

O `frontend/vercel.json` reescreve as rotas da SPA para `index.html`, permitindo
abrir ou atualizar diretamente `/login`, `/categorias`, `/transacoes` e `/relatorios`.

Crie o deploy e copie a origem de produção estável do frontend.

## 3. Finalizar o CORS e a autenticação

No projeto backend, ajuste `CORS_ORIGINS` com a origem exata do frontend, sem
caminho e sem barra final. Para manter acesso local também, use uma lista separada
por vírgulas, por exemplo:

```text
https://SEU_FRONTEND.vercel.app,http://localhost:5173
```

Faça Redeploy do backend após salvar as variáveis. O `.env` local não é enviado
para a Vercel; variáveis de cada projeto são configuradas no painel.

No Supabase Auth, em URL Configuration, configure Site URL para a URL pública do
frontend e os Redirect URLs necessários ao fluxo de confirmação de e-mail. O login
por senha existente não exige mudar as tabelas. Teste o cadastro com confirmação
antes de apresentar. O fluxo atual retorna ao login após cadastrar.

Os endereços de Preview mudam por branch/deploy e têm variáveis separadas. Se for
testar Preview, configure a URL da API e a origem permitida correspondentes, sem
liberar indiscriminadamente todos os domínios `vercel.app`.

## 4. Verificação publicada

1. Abra `/login`, entre e atualize a página: a sessão deve permanecer na aba.
2. Abra diretamente `/transacoes` e atualize: não deve ocorrer 404 da hospedagem.
3. Crie uma categoria e uma transação de teste, recarregue e confira a persistência.
4. Edite a situação da transação e confira o dashboard e o relatório do mesmo mês.
5. Entre em outra conta e confira o isolamento dos dados.
6. Remova os registros de teste e confirme o logout.
7. Para apresentar o Lucas, selecione outubro de 2024.

Em caso de 502/503, consulte os Runtime Logs da API e `/health/db`. Confirme que
o certificado foi incluído e que o caminho em `sslrootcert` está correto. Falhas
de CORS exigem conferir a origem exata e fazer redeploy após alterar a variável.

Os limites de requisições atuais usam memória da instância. Na Vercel, eles não
formam uma cota global entre todas as instâncias; proteção global pode ser
acrescentada na plataforma conforme a necessidade do projeto.

## Referências

- Express: https://vercel.com/docs/frameworks/backend/express
- Arquivos da Function: https://vercel.com/docs/project-configuration/vercel-json#functions
- Vite e rotas SPA: https://vercel.com/docs/frameworks/frontend/vite
- Variáveis: https://vercel.com/docs/environment-variables/managing-environment-variables
