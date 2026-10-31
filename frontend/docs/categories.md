# Categorias — etapa 7

## Entrega

Rota protegida `/categorias`, com total e contagem por tipo, tabela de categorias e vínculos, formulário de cadastro/edição e confirmação de exclusão. Lista em ordem alfabética pt-BR; layout com lista/formulário lado a lado a partir de 1280 px e empilhados nas demais larguras. A tabela possui rolagem interna em espaços estreitos.

Componentes e páginas consultam `categoryService`; o serviço acessa o mesmo adaptador em memória utilizado por `financeService`. Não há importação de mocks nas páginas, chamadas HTTP, novas dependências ou alterações no backend/referências.

## Regras

- Nome obrigatório, aparado, com limite provisório de 80 caracteres. Nome duplicado exatamente no mesmo usuário/tipo é rejeitado; outro tipo ou usuário pode ter o mesmo nome. Caixa e acentos são preservados.
- Descrição opcional de até 160 caracteres, cor e ícone são dados visuais provisórios, agrupados em `appearance`. Não ampliam o schema nem pressupõem campos futuros do backend.
- Contagens consideram todos os lançamentos, incluindo pendentes e outros meses/anos. O conjunto inicial possui seis categorias e onze vínculos: Alimentação 2, Lazer 1, Moradia 3, Salário & Renda 3, Saúde 1, Transporte 1.
- Categoria em uso não pode ser excluída. O botão fica desabilitado, com motivo visível e descrição acessível. A confirmação só é aberta para categorias sem vínculos; o adaptador revalida a regra ao excluir.
- O tipo de uma categoria vinculada também é bloqueado, conforme `onUpdate: Restrict` da relação composta no schema. Renomear e mudar os metadados visuais continuam permitidos, preservando identificador e vínculos.
- Categorias sem transações podem mudar de tipo ou ser excluídas após confirmação. Não há desvinculação de transações, exclusão em cascata ou alteração automática de seu tipo.
- Criar, renomear e remover categorias atualiza os dados disponíveis em Transações e Visão Geral. Renomear não muda o saldo; cores alimentam a identificação visual e o gráfico existente.
- Nova Categoria e Editar focam o nome no formulário. Limpar/Cancelar reinicia o formulário e cancela uma gravação simulada ainda pendente. Após uma alteração concluída, o foco retorna ao título da página.
- Envios duplicados são bloqueados. Falhas de gravação preservam campos para tentar novamente; a exclusão mantém o diálogo aberto em caso de falha e bloqueia uma nova confirmação se detectar vínculo ou registro ausente.
- Sessão e dados permanecem apenas em memória e reiniciam ao recarregar. Novas contas recebem seis categorias demonstrativas sem transações, conforme a inicialização da etapa 5; esse comportamento não é proposto para o backend.

## Revisão manual

Execute `npm run dev` em `frontend/` e entre com `lucas.mendes@email.com` / `12345678`.

1. Abra Categorias e confira seis registros, uma categoria de receita, cinco de despesa e os vínculos reais. Todas as categorias iniciais estão em uso e têm exclusão bloqueada.
2. Edite Moradia: o tipo está bloqueado. Renomeie para Casa; consulte a identificação nas transações e no gráfico do dashboard. O saldo de outubro deve continuar R$ 3.420,50.
3. Crie Educação com descrição, ícone e cor. Confira que aparece no formulário de transações do tipo correspondente. Teste nome vazio e duplicado; os campos permanecem disponíveis para correção.
4. Edite uma categoria sem vínculos e altere seu tipo. Cancele a edição e uma exclusão; depois confirme a exclusão. Contagens e opções de categorias devem acompanhar a mudança.
5. Crie uma categoria e uma transação pendente vinculada em outro ano. Ao voltar à lista, a categoria terá exclusão e troca de tipo bloqueadas. Apagar a transação deve liberar essas operações.
6. Para revisar vazio, cadastre uma conta fictícia e exclua suas seis categorias sem vínculos. O formulário deve continuar disponível para criar a primeira categoria.
7. Após entrar, abra `/categorias?cenario=erro` e use Tentar novamente. A ação remove a falha simulada e consulta novamente. Falhas de gravação também são tratadas pelos serviços, sem um fluxo artificial de erro no produto.
8. Confira Tab/Shift+Tab, seleção de cores pelo teclado, Escape na confirmação, foco do formulário e rolagem própria da tabela em celular.

## Verificação e referência visual

Testes cobrem contagens sem filtros, unicidade por usuário/tipo, validações, metadados provisórios, renomeação e saldo, bloqueios de exclusão/tipo, vínculo criado após a leitura, exclusão após remover o vínculo, isolamento, cancelamento, falhas e lista vazia. Execute `npm test`, `npm run lint` e `npm run build`.

Resultado da entrega: 72 testes aprovados (13 novos de categorias), build com TypeScript e lint sem erros. No navegador, também passaram recuperação de falhas, cancelamento durante gravação/exclusão, estado vazio em outra conta, campos no tamanho máximo em 320 px e bloqueio de uma confirmação aberta antes da criação de um vínculo pendente.

Comparação visual com `categorias_gerenciamento/screen.png`, usando screenshots temporários com Edge headless/Playwright do ambiente. Larguras verificadas: 320, 375, 768, 1024, 1280 e 1440 px. Não há dependência adicional nem screenshots versionados.

Diferenças intencionais do Stitch: marca e ícones SVG íntegros; contagens derivadas dos lançamentos; exclusão/troca de tipo bloqueadas em uso; confirmação em modal somente quando solicitada; campos explícitos de descrição/ícone; limites e validações; labels e foco acessíveis; ordem alfabética. Textos de auditoria fiscal e integração real foram substituídos por informações coerentes com a demonstração. As referências permanecem intactas.

O contrato permanece provisório em [api-contract.md](api-contract.md). Relatórios será implementado somente após aprovação desta etapa.
