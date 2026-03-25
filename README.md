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

## 📅 Cronograma Detalhado LumoStudy (Semana 1 a 27)

### 🏰 Fase 1: Fundamentação e Design UI/UX (Abril)

**Semana 1:**
* **Design:** Criação do Mapa do Site e Fluxograma do Usuário (User Flow).
* **Design:** Definição do Guia de Estilos (Paleta de cores, tipografia, raios de borda).
* **Infra:** Setup do Repositório Monorepo e Configuração do Docker/Podman inicial.
* **Back:** Definição da Arquitetura da API (Pastas e Bibliotecas do FastAPI).

**Semana 2:**
* **Design:** Wireframes (baixa fidelidade) de todas as telas (Login, Dash, Estudos, IA).
* **Front:** Início do setup Next.js + Tailwind e criação de componentes atômicos (Botões, Inputs).
* **Back:** Modelagem do Banco de Dados (DER) e scripts de migração inicial.
* **Infra:** Instalação e configuração do Rancher Desktop (Kubernetes) local.

**Semana 3:**
* **Design:** Protótipo de Alta Fidelidade (Figma) - Telas de Autenticação e Dashboard.
* **Front:** Construção das páginas de Login e Cadastro (UI funcional com validação).
* **Back:** Implementação do JWT e rotas de criação de conta.
* **Qualidade:** Setup do SonarQube para monitorar o código desde o início.

**Semana 4:**
* **Design:** Protótipo de Alta Fidelidade (Figma) - Telas de Flashcards, IA e Calendário.
* **Front:** Implementação da casca do site (Sidebar, Navbar e Layout persistente).
* **Infra:** Criação dos primeiros Manifestos IaC (Deployment e Service do Banco).
* **Back:** Integração da primeira rota autenticada (Perfil do Usuário).

---

### 🧪 Fase 2: Core Business e Statelessness (Maio - Junho)

**Semana 5 a 8:**
* **Front:** Integração real do Front com a API de Auth (Login persistente).
* **Back:** CRUD completo de Materiais de Estudo e Temas.
* **Infra:** Configuração de ConfigMaps e Secrets no K8s para segurança.
* **Estateless:** Validação técnica: Garantir que nenhum arquivo ou sessão fique no container.

**Semana 9 a 12:**
* **IA:** Integração com API de Inteligência Artificial (Resumos e Quizzes).
* **Front:** Interface interativa para visualização de resumos gerados pela IA.
* **Qualidade:** Implementação do Qodana para análise estática profunda.
* **Back:** Lógica de Flashcards (algoritmo de repetição espaçada).

---

### 🛡️ Fase 3: Programação Orientada a Aspectos e Refinamento (Julho)

**Semana 13 a 17:**
* **POAS:** Criação de decoradores e middlewares para Logging e Auditoria.
* **POAS:** Centralização do tratamento de erros em um Aspecto transversal.
* **Front:** Criação de dashboards de progresso com gráficos (Chart.js).
* **Infra:** Implementação de Health Checks (Liveness e Readiness Probes).

---

### ⚡ Fase 4: Orquestração Avançada e Performance (Agosto)

**Semana 18 a 21:**
* **K8s:** Configuração de Horizontal Pod Autoscaler (HPA) para escalabilidade.
* **Performance:** Otimização de queries SQL e cache de rotas pesadas.
* **Front:** Otimização de Core Web Vitals (SEO e performance de carregamento).
* **QA:** Rodada intensiva de testes manuais e correção de bugs do SonarQube.

---

### 🎓 Fase 5: Entrega e Documentação (Setembro)

**Semana 22 a 24:**
* **Documentação:** Finalização do Swagger/OpenAPI e Manual de Deploy IaC.
* **Front:** Polimento visual (Animações com Framer Motion e Dark Mode).
* **QA:** Testes de integração End-to-End (E2E) simulando o aluno real.

**Semana 25 a 27:**
* **Ajustes:** Refinamento final de UI/UX baseado em testes de usabilidade.
* **Demo:** Gravação do vídeo do projeto e preparação do ambiente de defesa.
* **Final:** Congelamento de código e entrega final. 🚀

---

> "A felicidade pode ser encontrada, mesmo nas horas mais difíceis, se alguém se lembrar de acender a luz." 
> — **Alvo Dumbledore**
