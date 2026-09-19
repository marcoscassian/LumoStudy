# LumoStudy — fechamento técnico

Este pacote foi revisado para deixar a base pronta para a próxima etapa: trocar imagens/sprites e publicar backend + banco.

## Corrigido / concluído

- Rotas da barra lateral para **Ranking**, **Loja** e **Conquistas**.
- Link **Ver como funciona** da página inicial.
- Cadastro e login integrados ao backend sem expor `senha_hash` nas respostas públicas.
- Rotas administrativas de usuários protegidas por autenticação de administrador.
- Sessões JWT versionadas: trocar/redefinir senha invalida tokens antigos.
- Atualização de e-mail/perfil devolve um token atualizado ao frontend.
- Recuperação de senha por SMTP com token único, expiração e invalidação de links antigos.
- Configuração SMTP genérica (Gmail ou outro provedor compatível).
- API base do frontend centralizada para funcionar localmente e em hospedagem.
- Configuração por variáveis do serviço de hospedagem tem prioridade sobre `.env` local.
- Suporte a `DATABASE_URL` para MySQL remoto e opção de certificado CA/TLS.
- Endpoint `/health` valida API e conexão com o banco.
- Metas diária/semanal/mensal agora podem ser editadas nas Configurações e ficam salvas no MySQL.
- Correção de simulado bloqueia resposta duplicada e questão que não pertence à tentativa.
- Cadastro não pode liberar cosméticos da loja manipulando a requisição.
- Conquistas desbloqueadas passam a ficar persistidas no banco, mesmo após gastar moedas ou perder streak.
- Migrations novas `0008` (segurança de sessões), `0009` (conquistas persistentes) e `0010` (cronograma personalizado).
- Documentação para banco online em `BANCO_ONLINE.md`.
- **Cronograma personalizado** com 7 dias, horas diárias configuráveis e seleção de manhã/tarde/noite.
- Cronograma adaptativo: prioriza áreas com menor aproveitamento sem deixar de cobrir as quatro áreas do ENEM.
- Atividades do cronograma abrem Questões, Flashcards e Simulados já direcionados; questões do plano usam nível **misto** (fácil, médio e difícil).
- Simulados de 25 questões entram nos planos menores; com pelo menos 5 horas diárias o plano pode reservar um simulado completo de 90 questões.
- Atividades podem ser marcadas como concluídas e ficam persistidas no MySQL.

## Arquivos visuais que você pode trocar depois

Os avatares finais ficam em `frontend/public/loja/avatares/<casa>/`, totalizando 16 PNGs. As sprites dos mascotes ficam em `frontend/public/sprites/mascotes/`. Veja `PERSONALIZACAO.md` para todos os nomes e tamanhos.

## Antes de publicar

1. Copie `backend/.env.example` para `backend/.env` apenas na máquina/servidor onde o backend roda.
2. Defina um `JWT_SECRET` forte.
3. Configure `DATABASE_URL` do MySQL online.
4. Configure o SMTP e `FRONTEND_URL`.
5. Defina `CORS_ORIGINS` com a URL real do frontend.
6. No frontend hospedado separadamente, defina `NEXT_PUBLIC_API_URL` com a URL pública do backend.
7. Não envie `.env`, senhas, certificados privados ou credenciais ao GitHub.

## Funcionalidades opcionais não incluídas

Por decisão do projeto, ficaram fora desta versão:

- microtarefas;
- página de conteúdos que mais caem no ENEM.

## Ajustes de perfil e questões (18/09/2026)
- Restaurado o seletor de foto de perfil em Configurações.
- Avatares comprados na Loja podem ser equipados diretamente em Configurações; os bloqueados direcionam para a Loja.
- O seletor de avatar foi mantido, mas a regra foi evoluída posteriormente: agora o curso/casa controla a cor global do LumoStudy.
- Adicionada opção de voltar para a foto padrão sem perder avatares comprados.
- Corrigida a exibição dos enunciados do ENEM: marcadores/links Markdown de imagens não aparecem mais como texto nem duplicam a imagem.
- A limpeza também vale para questões usadas em simulados.

## Identidade por curso, avatares e mascotes (18/09/2026)

- Cadastro agora exige a escolha do curso: Informática, Eletro, Vestuário ou Têxtil.
- O curso define permanentemente a casa/tema da conta; trocar avatar não troca mais a casa.
- Mapeamento atual: Informática/Grifinória, Eletro/Sonserina, Vestuário/Corvinal e Têxtil/Lufa-Lufa.
- Loja passou a ter 16 slots de avatar: 4 desenvolvedores × 4 casas.
- Cada usuário visualiza apenas os 4 avatares correspondentes à própria casa.
- Compras antigas dos quatro avatares são migradas para a versão equivalente da casa do usuário quando possível.
- Coruja definida como mascote padrão e gratuito.
- Gato, sapo, rato e serpente adicionados como mascotes compráveis.
- Avatar e mascote podem permanecer equipados simultaneamente.
- Configurações agora permitem escolher avatar e mascote separadamente.
- Barra lateral usa o mascote equipado e transforma a carta em central de notificações.
- Notificações possuem contador de não lidas, leitura individual e ação para marcar todas como lidas.
- Conta nova recebe carta de boas-vindas; compras na Loja geram uma nova notificação.
- Adicionada migration `0011` para curso, mascote e notificações.
- Criado `PERSONALIZACAO.md` com os caminhos das 16 imagens e a especificação atual das sprites. A coruja enviada usa quadros de `96×96`: normal com 6 frames (`576×96`) e com notificação com 5 frames (`480×96`).

### Correção de comportamento antigo

O trecho anterior deste documento dizia que o avatar controlava a cor do aplicativo. Isso não vale mais: **agora o curso/casa controla o tema; o avatar é apenas a foto do perfil.**

## Ajustes da carta e aparência

- O botão de fechar da carta foi centralizado dentro do círculo.
- O selo superior da carta agora exibe “Estudo de correspondência”.
- Configurações ganhou a escolha entre “Roxo padrão” e “Cor da sua casa”.
- `tema_roxo_padrao` agora é realmente persistido pelo backend e reaplicado no login/carregamento do usuário.


## Coruja dinâmica e notificações do Admin (19/09/2026)

- As artes enviadas em `mascotes.zip` foram integradas ao projeto.
- `coruja.png` usa os 6 frames normais enviados pelo usuário.
- `corujan.png` usa os 5 frames da coruja com carta.
- Sem notificação não lida, a barra lateral mostra `coruja.png`; com uma ou mais, troca automaticamente para `corujan.png`.
- A cartinha pequena separada foi removida: clicar no próprio mascote abre a carta mágica central.
- O contador de não lidas continua aparecendo como um pequeno badge.
- A barra lateral consulta novas notificações periodicamente, permitindo que mensagens do Admin apareçam sem recarregar manualmente a página.
- O Painel Admin ganhou a aba **Notificações**, com busca/seleção de usuário, título, mensagem e rota opcional.
- A API Admin ganhou endpoints protegidos para listar usuários e enviar notificações persistidas na tabela `notificacoes`.
- O `.env` local desta cópia foi preparado com a senha MySQL informada pelo usuário; o arquivo continua ignorado pelo Git.

## Meta diária, login e hidratação (19/09/2026)

- O layout passou a ignorar diferenças de hidratação causadas por atributos inseridos por extensões do navegador no `<body>`, como `cz-shortcut-listen`.
- A central de notificações verifica a meta diária do dia anterior e cria, no máximo uma vez por dia, uma carta automática quando alguma meta diária não foi cumprida.
- A carta informa o que faltou em tempo de estudo, flashcards e/ou questões e direciona para a Trilha.
- Contas recém-criadas não recebem cobrança por dias anteriores ao cadastro.
- O botão da carta foi redesenhado como **Ler todas**, com estado de carregamento e atualização imediata do mascote/contador.
- A tela de Login ganhou uma chamada mais visível para cadastro, com o botão **Criar minha conta** dentro do próprio cartão de acesso.
