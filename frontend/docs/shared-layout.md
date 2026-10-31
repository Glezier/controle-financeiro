# Layout compartilhado — Etapa 3

Registro da etapa 3. Na [etapa 4](authentication.md), o perfil fixo foi substituído pela sessão em memória, “Sair” foi habilitado e o acesso às páginas passou a depender do login demonstrativo.
Na [etapa 5](dashboard.md), a Visão Geral recebeu dados financeiros, e o contêiner da tabela foi ajustado para conter rótulos acessíveis e o foco em telas estreitas.
Na [etapa 6](transactions.md), `/transacoes` recebeu a gestão de lançamentos com os componentes compartilhados. A tabela de rotas abaixo registra o estado original da etapa 3.
Na [etapa 7](categories.md), `/categorias` recebeu cadastro, edição e exclusão simulada com preservação dos vínculos.

## Entrega

- Sidebar desktop de 256 px, cabeçalho de 64 px e área principal limitada a 1440 px.
- Menu em gaveta abaixo de 1024 px, com backdrop, bloqueio da rolagem de fundo e fechamento por Escape, botão, clique fora ou seleção de destino.
- Marca e ícones SVG locais, substituindo os recursos quebrados do Stitch.
- Data atual em pt-BR, perfil ilustrativo recebido por props e menu com identificação da rota ativa.
- Botões, cards, badges, campos de texto/select, tabela responsiva, modal e feedbacks de informação, sucesso, carregamento, vazio e erro.
- Amostra interativa em `/componentes`, destinada somente à revisão desta etapa.

## Rotas

| Rota | Estado |
| --- | --- |
| `/` | Redireciona para `/visao-geral` |
| `/visao-geral` | Espaço reservado para a etapa 5 |
| `/transacoes` | Espaço reservado para a etapa 6 |
| `/categorias` | Espaço reservado para a etapa 7 |
| `/relatorios` | Espaço reservado para a etapa 8 |
| `/componentes` | Amostra dos componentes compartilhados |
| Outras | Mensagem de página não encontrada |

O React Router usa `BrowserRouter`. O servidor de desenvolvimento suporta acesso direto e recarga dessas URLs. A hospedagem futura deverá redirecionar URLs de páginas para `index.html`; nenhuma configuração de deploy é necessária nesta etapa.

## Organização e uso

- `components/layout`: `AppLayout`, `Sidebar`, `Header` e `Brand`.
- `components/ui`: `Button`, `Badge`, `Card`, `DataTable`, `Icon` e `Modal`.
- `components/forms/Field.tsx`: `TextField` e `SelectField`, com IDs, labels, hints e erros associados.
- `components/feedback/Feedback.tsx`: apresentação semântica dos estados de resposta.
- `routes`: destinos de navegação e composição das rotas.
- `pages`: espaço reservado reutilizável e amostra dos componentes.
- `types/profile.ts`: dados de apresentação do perfil; não define contrato de autenticação.
- `styles/components.css` e `styles/layout.css`: estilos com os tokens da etapa 2.

`AppLayout` recebe `UserProfile` por props. O perfil fixo em `App.tsx` é apenas uma fixture de apresentação do layout, sem tokens, credenciais ou acesso a serviços. Na etapa de autenticação, sua origem será isolada em serviços. As linhas da tabela em `/componentes` são exemplos estáticos para revisão dos componentes, sem CRUD ou estado financeiro compartilhado.

`Button` aceita `variant`, `loading` e atributos nativos; seu tipo padrão é `button`. `TextField`/`SelectField` aceitam atributos nativos, `hint` e `error`. `DataTable` recebe `caption` e conteúdo semântico de tabela, com rolagem horizontal dentro da região focável. `Modal` é controlado por `open`/`onClose`, usa `dialog` nativo e aceita variação `drawer`.

## Acessibilidade e decisões

- Navegação com links reais, `aria-current`, link de salto e foco no conteúdo ao mudar de rota.
- Modal/gaveta com título associado, foco contido por Tab e Shift+Tab, retorno de foco e Escape.
- Ícones decorativos ocultos de tecnologias assistivas; botões sem texto recebem nome acessível.
- `role="alert"` para erros e `role="status"` para sucesso/carregamento.
- Status financeiros sempre identificados por texto, além da cor.
- Campos com `aria-invalid` e `aria-describedby` quando necessário.
- Áreas clicáveis de ícones com pelo menos 44 px; campos e botões textuais com pelo menos 40 px.
- A data atual substitui a data fixa de 2024 da exportação.
- O selo informa “Conta de demonstração”, sem afirmar autenticação real.
- “Sair” permanece desabilitado com explicação até a etapa de autenticação. Recuperação de senha, exportações, orçamento e reserva não foram implementados.

## Validação

- Build com TypeScript e lint aprovados.
- Edge headless com Playwright já disponível no ambiente: 320, 375, 768, 1024 e 1440 px, sem overflow horizontal da página. Tabelas mantêm rolagem interna.
- Acesso direto às quatro rotas principais, indicação da rota ativa, redirecionamento inicial e endereço inexistente verificados.
- Abertura/fechamento de modal por Escape e backdrop; Tab/Shift+Tab contidos e retorno de foco verificados.
- Gaveta fecha ao navegar e ao ampliar para desktop; foco após navegação e retorno ao acionador ao cancelar verificados.
- Link de salto, perfil e feedbacks de exemplo verificados; sem erros JavaScript de página.
- Screenshots desktop/mobile inspecionados em diretório temporário, sem arquivos gerados no Git.

Nenhuma dependência de testes foi adicionada. O único pacote novo da aplicação nesta etapa é `react-router-dom`; o formatter foi usado temporariamente. Esta verificação não substitui a revisão geral de acessibilidade ou os testes funcionais das próximas páginas.

## Próxima etapa

A etapa 4, autenticação visual com serviços simulados, depende de aprovação. As páginas financeiras permanecem sem implementação funcional.
