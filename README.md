# 🪄 LumoStudy

**LumoStudy** é uma plataforma web de estudos desenvolvida como projeto prático para a disciplina de **Programação de Objetos Aplicada a Serviços (POAS)**, integrante do 4º ano do curso Técnico em Informática para Internet do **IFRN**.

O projeto une a eficiência das tecnologias modernas de desenvolvimento com a atmosfera inspiradora da saga Harry Potter, criando um ambiente onde o aprendizado é a verdadeira magia.

---

## 👥 Equipe
* **Alex Bruno**
* **Icaro Emanuel**
* **Ludimila Erika**
* **Marcos Cassiano**

---

## 📜 Descrição do Tema
Inspirado no feitiço *Lumos* (que traz luz aos lugares escuros), o **LumoStudy** tem como missão iluminar o caminho para o conhecimento. A plataforma irá utilizar elementos visuais e narrativos do mundo bruxo para trazer uma experiência de estudo de forma divertida e atrativa, permitindo que os alunos organizem suas tarefas, acessem conteúdos e acompanhem seu progresso.

---

## 🛠️ Tecnologias de Frontend
Para garantir uma interface veloz, otimizada e reativa (quase como um passe de mágica), utilizamos:

* **Next.js**: Framework React para produção, garantindo SSR (Server Side Rendering) e uma navegação fluida.

---

# 📅 Cronograma de Desenvolvimento

| Período | Objetivo da Etapa |
|---------|-------------------|
| **17/04 – 30/04** | Planejamento do projeto, definição do problema, público-alvo, levantamento inicial dos requisitos, criação do repositório, organização do Trello e estruturação da documentação. |
| **01/05 – 15/05** | Modelagem do banco de dados, definição da arquitetura da aplicação e desenvolvimento dos primeiros protótipos (Login, Cadastro e Página Inicial). |
| **16/05 – 31/05** | Refinamento dos protótipos, definição dos endpoints da API, organização da estrutura do Front-end e Back-end e preparação para o desenvolvimento. |
| **01/06 – 15/06** | Implementação do Cadastro e Login (RF01 e RF02), integração inicial com o banco de dados e testes das funcionalidades. |
| **16/06 – 30/06** | Implementação do Logout e Recuperação de Senha (RF03 e RF04), refinamentos da autenticação e correção de inconsistências. |
| **01/07 – 15/07** | Desenvolvimento da Trilha de Aprendizado (RF05): prototipação das telas, criação dos endpoints e estrutura inicial da funcionalidade. |
| **16/07 – 31/07** | Integração da Trilha de Aprendizado ao sistema, exibição do progresso do usuário e testes da funcionalidade. |
| **01/08 – 15/08** | Desenvolvimento da Lista de Questões (RF06), incluindo banco de questões, feedback imediato e sistema de pontuação. |
| **16/08 – 31/08** | Implementação do Perfil do Usuário (RF07), estatísticas de desempenho e edição de informações pessoais. |
| **01/09 – 15/09** | Desenvolvimento dos Flashcards (RF08), organização dos decks e sistema de revisão ativa. |
| **16/09 – 30/09** | Implementação dos Simulados Cronometrados (RF09), correção automática e relatório de desempenho. |
| **01/10 – 15/10** | Desenvolvimento das funcionalidades de gamificação: Streak (RF10), Ranking (RF11), Metas Diárias (RF12) e Loja de Itens (RF13). |
| **16/10 – 30/10** | Integração geral do sistema, testes finais, correção de bugs, documentação e preparação para a apresentação e entrega do projeto. |

---

> "A felicidade pode ser encontrada, mesmo nas horas mais difíceis, se alguém se lembrar de acender a luz." 
> — **Alvo Dumbledore**

---

## 🚀 Como rodar o projeto

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

Copie `backend/.env.example` para `backend/.env` e ajuste o MySQL, JWT e SMTP. Depois:

```bash
python -m uvicorn main:app --reload --port 8000
```

Na inicialização, o backend cria/verifica o banco local quando permitido, aplica todas as migrations e sincroniza provas, questões, simulados, metas e itens da loja.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abra `http://localhost:3000`. Para backend hospedado separadamente, copie `frontend/.env.example` para `frontend/.env.local` e defina `NEXT_PUBLIC_API_URL`.

## 🔐 Recuperação de senha

A recuperação de senha usa um token de uso único, armazenado apenas como hash no MySQL. O provedor de e-mail é configurável por SMTP.

No `backend/.env`, configure pelo menos:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=SUA_SENHA_DE_APP_OU_SENHA_SMTP
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
FRONTEND_URL=http://localhost:3000
```

O link expira conforme `RESET_TOKEN_MINUTES` (30 minutos por padrão), só pode ser usado uma vez e os links anteriores são invalidados quando um novo é solicitado. Ao redefinir a senha, sessões antigas também deixam de ser aceitas.

> Nunca coloque senha SMTP, `JWT_SECRET` ou credenciais do banco no GitHub. Arquivos `.env` são ignorados pelo Git.

## 📅 Cronograma personalizado

A página **Cronograma** monta automaticamente os próximos 7 dias de estudo. O usuário escolhe:

- quantas horas consegue estudar por dia (de 1 a 10 horas, aceitando meia hora);
- se prefere estudar de manhã, à tarde e/ou à noite.

O plano combina **questões em nível misto**, **flashcards** e **simulados**, usando o histórico de respostas para aumentar a frequência das áreas com menor aproveitamento. Todas as quatro áreas do ENEM continuam aparecendo no ciclo. O botão **Recalcular plano** atualiza as prioridades conforme o desempenho mais recente.

As preferências e atividades são persistidas no MySQL pela migration `0010`.

## 🌐 Banco compartilhado / online

Usar `MYSQL_HOST=localhost` cria um banco diferente em cada computador. Para todos usarem as mesmas contas e progresso, hospede um MySQL central e configure `DATABASE_URL` no backend.

Veja **`BANCO_ONLINE.md`** para o passo a passo e **`backend/MIGRATIONS.md`** para detalhes da inicialização do schema.

## 🏰 Cursos, casas e personalização

No cadastro, o aluno escolhe seu curso do IFRN Campus Caicó. O curso define a casa e o tema visual da conta:

- Informática → Corvinal;
- Eletro → Grifinória;
- Vestuário → Sonserina;
- Têxtil → Lufa-Lufa.

A Loja exibe apenas os quatro avatares da casa do usuário. Existem 16 slots de avatar no total, correspondentes a Ludimila, Ícaro, Alex e Marcos em cada uma das quatro casas.

O sistema de mascotes também está preparado: a coruja é padrão e gratuita, enquanto gato, sapo, rato e serpente são compráveis. O mascote aparece na barra lateral e entrega as notificações por meio da carta.

Veja **`PERSONALIZACAO.md`** para os nomes exatos dos arquivos e o formato das spritesheets.
