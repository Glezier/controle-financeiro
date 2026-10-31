# Transações — etapa 6

Registro da etapa 6. Na [etapa 7](categories.md), a gestão de categorias foi implementada sobre o mesmo adaptador, com renomeação refletida nos lançamentos e exclusão/troca de tipo bloqueadas enquanto houver vínculos.

## Escopo

Rota protegida `/transacoes`, acessível pelo menu após o login fictício. Usa o mesmo livro de lançamentos do dashboard. Não há chamadas HTTP, persistência, exportação ou alterações no backend. Nenhuma dependência foi adicionada.

A implementação segue páginas/componentes → `financeService` → adaptador de mocks. `useTransactions` controla carregamento, falha, atualização e cancelamento de consultas obsoletas. `TransactionFilters`, `TransactionTable` e `DeleteTransactionDialog` isolam responsabilidades da tela. O formulário de criação/edição, os detalhes e os indicadores reutilizam a base anterior.

## Comportamento

- Outubro de 2024: oito lançamentos, receitas efetivadas de R$ 5.800,00, despesas efetivadas de R$ 2.379,50, despesas pendentes de R$ 350,00 e saldo de R$ 3.420,50.
- Todo o período: onze lançamentos em duas páginas, saldo de R$ 6.550,50. Indicadores abrangem todos os resultados filtrados, não apenas a página visível.
- Busca por descrição sem distinção de acentos/caixa, combinada com período, tipo, categoria e situação. Busca mantém o texto digitado; normalização ocorre na seleção dos resultados.
- Filtros e página aparecem na URL. Digitação substitui a entrada atual do histórico; seleções e paginação criam entradas. Mudar filtros reinicia a página. Limpar filtros seleciona todo o período.
- Ordenação por data financeira decrescente, criação decrescente e identificador. Oito registros por página; página fora do intervalo é ajustada na resposta.
- Criar e editar utilizam o mesmo formulário, validações e mensagens por campo. Na edição, o valor é preenchido exatamente em reais e centavos; identidade e data de criação são preservadas.
- Alterar receita/despesa limpa a categoria. Categorias de outro usuário ou incompatíveis são rejeitadas também no serviço.
- Após salvar, a tela seleciona o mês do lançamento, limpa os demais filtros e informa a atualização. O lançamento pode estar em outra página conforme sua data. Após excluir, mantém os filtros e ajusta a página.
- A descrição abre detalhes; os botões de editar/excluir têm nomes acessíveis por lançamento. Exclusão exige confirmação e oferece cancelamento. Falhas mantêm o modal aberto para tentar novamente.
- Formulários e confirmação impedem envios duplicados. Fechar/Cancelar aborta operações simuladas ainda pendentes. Após concluir uma alteração, o foco vai ao título da página para orientar o retorno à listagem.
- Pendências não alteram o saldo efetivado. Excluir ou editar um lançamento recalcula os indicadores tanto na listagem quanto no dashboard.

Os dados são apenas demonstrativos e separados por e-mail no mock. Novos usuários começam sem transações; recarregar a página reinicia sessão e dados. Essa separação não substitui a autorização do servidor.

## Revisão manual

Execute `npm run dev` em `frontend/` e entre com `lucas.mendes@email.com` / `12345678`.

1. Abra Transações e compare os oito registros com os indicadores de outubro.
2. Escolha Todo o Período e avance à página 2. O saldo continua R$ 6.550,50.
3. Busque `farmacia` e combine filtros. Uma combinação incompatível deve exibir o estado vazio. Limpe os filtros e teste o histórico do navegador.
4. Crie receita e despesa, efetivadas e pendentes. Teste descrição vazia, valor zero/negativo, data inválida e categoria ausente. Observe o mês selecionado após salvar.
5. Edite Internet Fibra de pendente para efetivada: em outubro, o saldo passa a R$ 3.070,50. Mude o mês ou o tipo de um lançamento e confira a categoria e os indicadores.
6. Abra detalhes, cancele uma exclusão e depois confirme. Excluir uma pendência mantém o saldo; excluir uma receita efetivada o reduz.
7. Abra `/transacoes?period=2024-10&cenario=erro` após entrar e teste Tentar novamente. O cenário força uma falha de leitura; repetir remove a falha. Estados de erro de gravação são suportados pelos serviços, sem botão de simulação no produto.
8. Confira foco, Tab/Shift+Tab, Escape, nomes dos controles e rolagem própria da tabela em tela estreita.

## Verificações e diferenças visuais

Os testes automatizados cobrem consultas combinadas, busca, paginação e totais, normalização da URL, edição entre períodos/tipos, exclusão, integridade por usuário, valores limite, falhas e cancelamento. Execute `npm test`, `npm run lint` e `npm run build`.

Verificação visual e funcional com Edge headless/Playwright do ambiente, sem dependência no projeto: larguras de 320, 375, 768, 1024, 1280 e 1440 px. Screenshots locais temporários foram usados para comparação com `transa_es_gest_o_e_formul_rio/screen.png`; não são artefatos versionados.

Diferenças intencionais da exportação: marca e ícones SVG íntegros; exportação omitida; labels de filtros visíveis; ordenação consistente com o dashboard; dados coerentes entre telas; pendências identificadas em âmbar; ações com alvo e nome acessíveis; quatro indicadores em telas largas e grid de duas/uma coluna nas demais; tabela com rolagem interna no celular. A data do cabeçalho permanece a data atual e os dados fictícios permanecem em 2024. Não há fluxos de orçamento, reserva ou recuperação de senha.

Categorias está documentado em [categories.md](categories.md); Relatórios permanece reservado à próxima etapa. O contrato de integração permanece provisório em [api-contract.md](api-contract.md).
