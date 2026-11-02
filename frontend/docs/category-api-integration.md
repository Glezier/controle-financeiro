# Integração de categorias com a API

A instância `categoryService` utilizada pela aplicação acessa a API autenticada.
A fábrica `createCategoryService(adapter)` foi preservada para os testes isolados
com dados simulados. Transações, dashboard e relatórios também usam a API;
alterações persistidas nas categorias são refletidas ao carregar essas telas.

## Contrato

- `GET /api/v1/categories`: lista do usuário autenticado, incluindo `transaction_count`.
- `POST /api/v1/categories`: criação com `name`, `type` e `icon`.
- `PATCH /api/v1/categories/:id`: edição com os mesmos campos.
- `DELETE /api/v1/categories/:id`: exclusão, com resposta 204.

O cliente HTTP existente envia o Bearer token e renova a sessão quando necessário.
O e-mail recebido pelos hooks serve somente como chave para atualizar a interface;
não é enviado como proprietário ou parâmetro de autorização.

A API fornece as contagens de vínculos sem carregar todos os lançamentos no
navegador. Nome duplicado, categoria em uso, registro ausente e erros de validação
são apresentados no formulário ou diálogo correspondente. Cancelar uma chamada
interrompe a espera no cliente, mas não desfaz uma escrita já processada no servidor.

Os onze identificadores de ícone aceitos pelo backend são preservados nas leituras
e edições. A interface usa seus ícones SVG disponíveis para apresentá-los. As cores
são derivadas do ícone; os controles de cor e descrição visual foram retirados,
pois esses campos não existem no contrato de persistência.

## Execução

Configure `VITE_API_URL=http://localhost:3001/api/v1` em `frontend/.env.local`
e mantenha a origem do frontend em `CORS_ORIGINS` no backend. Reinicie o Vite
após alterar a variável. Em produção use a URL HTTPS pública da API.

Depois de iniciar backend e frontend, entre com uma conta do Supabase e verifique:

1. Categorias e contagens reais carregam em `/categorias`.
2. Uma categoria nova reaparece após recarregar a página.
3. Renomear e mudar o ícone persistem; nome duplicado apresenta erro no campo.
4. Categorias vinculadas bloqueiam exclusão e troca de tipo.
5. Uma categoria sem vínculos pode mudar de tipo ou ser excluída.
6. Outra conta não vê a categoria criada na primeira.

## Verificações automatizadas

Em `frontend`: `npm run build`, `npm run lint` e `npm test`.
`tests/apiCategoryService.test.ts` verifica o transporte HTTP, payload, contagens,
conflitos, validação, cancelamento e respostas incompatíveis.

Para testar também contra a API e o PostgreSQL temporário, inicie em `backend`:

```bash
npm run dev:local
```

Em outro terminal, em `frontend`:

```bash
CATEGORY_API_INTEGRATION_URL=http://127.0.0.1:3002/api/v1 npx vitest run tests/categoryApi.integration.test.ts
```

Esse teste exige o header `X-Local-Demo: true` e usa as duas contas fictícias do
modo local. Cria, consulta, edita e exclui uma categoria temporária; também verifica
conflitos e isolamento entre usuários. Não acessa o Supabase. Sem a variável,
é ignorado pela suíte padrão. Os E2E antigos em `tests/e2e` foram escritos para a
demonstração inteiramente simulada e ainda precisam ser adaptados à integração.
