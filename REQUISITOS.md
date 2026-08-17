# 📚 Requisitos do Sistema

> **Projeto:** LumoStudy
> **Categoria:** Plataforma Gamificada de Estudos

---

## 📌 1. Requisitos Funcionais

Os **Requisitos Funcionais (RF)** descrevem as funcionalidades que o sistema deve oferecer para permitir que o utilizador estude, acompanhe seu desempenho e interaja com os recursos da plataforma.

### 📊 Resumo de Prioridades

|     Prioridade     | Requisitos                         |
| :----------------: | :--------------------------------- |
| 🔴 **Obrigatório** | RF01, RF02, RF03, RF05, RF06       |
| 🟡 **Recomendado** | RF04, RF07, RF08, RF09, RF10, RF11 |
|   🟢 **Opcional**  | RF12, RF13                         |

---

### 🔐 RF01 - Cadastro de Usuários

**Descrição**
Permitir que novos utilizadores criem uma conta para salvar seu progresso nas trilhas e utilizar os recursos da plataforma.

**Prioridade:** 🔴 **Obrigatório**

**Entrada e condição anterior**

* O utilizador não deve possuir uma conta ativa.
* O sistema deve solicitar:

  * Nome de utilizador ou nome de bruxo;
  * E-mail;
  * Senha segura.

**Saída e condição posterior**
A conta deve ser criada com sucesso e os dados devem ser armazenados no banco de dados.

---

### 🔑 RF02 - Realizar Login

**Descrição**
Permitir o acesso de utilizadores que já possuem uma conta cadastrada.

**Prioridade:** 🔴 **Obrigatório**

**Entrada e condição anterior**

* E-mail cadastrado;
* Senha válida.

**Saída e condição posterior**
O utilizador deve ser autenticado e ter acesso ao seu perfil e progresso.

---

### 🚪 RF03 - Realizar Logout

**Descrição**
Permitir que o utilizador encerre sua sessão na plataforma.

**Prioridade:** 🔴 **Obrigatório**

**Entrada e condição anterior**

* O utilizador deve estar autenticado;
* O utilizador deve selecionar a opção de sair.

**Saída e condição posterior**
A sessão deve ser encerrada e o utilizador deve ser direcionado para a tela de autenticação.

---

### 🔄 RF04 - Recuperação de Senha

**Descrição**
Permitir que o utilizador redefina sua senha caso esqueça suas credenciais de acesso.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* E-mail cadastrado no sistema.

**Saída e condição posterior**
O sistema deve enviar um link de redefinição para o e-mail cadastrado, permitindo que o utilizador crie uma nova senha.

---

### 🧭 RF05 - Trilha de Aprendizado

**Descrição**
Permitir a visualização estruturada dos conteúdos da plataforma, organizados em módulos ou anos letivos de forma sequencial.

**Prioridade:** 🔴 **Obrigatório**

**Entrada e condição anterior**

* O utilizador deve acessar a área de conteúdos.

**Saída e condição posterior**

* Exibição do progresso atual;
* Indicação dos conteúdos concluídos;
* Indicação dos próximos temas disponíveis.

---

### 📝 RF06 - Lista de Questões

**Descrição**
Permitir que o utilizador resolva exercícios relacionados aos temas estudados, recebendo feedback após cada resposta.

**Prioridade:** 🔴 **Obrigatório**

**Entrada e condição anterior**

* Seleção de um tema dentro da trilha de aprendizado.

**Saída e condição posterior**

* Exibição de acerto ou erro;
* Exibição da pontuação obtida;
* Atualização do progresso do utilizador.

---

### 👤 RF07 - Perfil do Utilizador

**Descrição**
Disponibilizar uma área contendo informações pessoais e estatísticas relacionadas ao desempenho do utilizador.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* Dados cadastrados do utilizador, como nome, foto ou "Casa".

**Saída e condição posterior**

* Exibição das informações do perfil;
* Possibilidade de editar os dados;
* Exibição de estatísticas de desempenho.

---

### 🃏 RF08 - FlashCards

**Descrição**
Disponibilizar um método de revisão baseado em cartões de memória para auxiliar na fixação dos conteúdos estudados.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* Seleção de um deck ou baralho de FlashCards.

**Saída e condição posterior**

* Exibição dos cartões;
* Registro do desempenho do utilizador;
* Utilização dos resultados para auxiliar na repetição espaçada.

---

### ⏱️ RF09 - Simulados Cronometrados

**Descrição**
Permitir a realização de avaliações com tempo limitado, apresentando o resultado somente após o término do teste.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* O utilizador deve iniciar o simulado;
* O cronômetro deve ser iniciado automaticamente.

**Saída e condição posterior**

* Encerramento do teste ao finalizar as questões ou o tempo;
* Exibição do resultado;
* Apresentação de um relatório final de desempenho.

---

### 🔥 RF10 - Streak (Foguinho)

**Descrição**
Registrar a frequência diária de estudos para incentivar a constância do utilizador.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* Utilizador autenticado;
* Realização de pelo menos uma atividade no dia.

**Saída e condição posterior**
O contador de dias consecutivos deve ser atualizado e exibido visualmente na plataforma.

---

### 🏆 RF11 - Sistema de Competição (Ranking)

**Descrição**
Disponibilizar um ranking entre os utilizadores para tornar o processo de estudo mais interativo e gamificado.

**Prioridade:** 🟡 **Recomendado**

**Entrada e condição anterior**

* Pontuação acumulada pelo utilizador.

**Saída e condição posterior**
Exibição da posição do utilizador em comparação com outros estudantes ou bruxos da plataforma.

---

### 🎯 RF12 - Definição de Metas

**Descrição**
Permitir que o utilizador estabeleça objetivos diários de estudo, como tempo de estudo ou quantidade de questões.

**Prioridade:** 🟢 **Opcional**

**Entrada e condição anterior**

* Inserção do valor da meta pelo utilizador.
* Exemplo: `20 minutos de estudo`.

**Saída e condição posterior**
Exibição de uma barra de progresso indicando visualmente o nível de conclusão da meta.

---

### 🛒 RF13 - Loja de Itens Virtuais

**Descrição**
Permitir a troca de moedas virtuais obtidas durante as atividades por itens cosméticos ou "poções" de recuperação.

**Prioridade:** 🟢 **Opcional**

**Entrada e condição anterior**

* O utilizador deve possuir saldo suficiente de moedas virtuais.

**Saída e condição posterior**

* Confirmação da compra;
* Desconto das moedas utilizadas;
* Item adicionado ao inventário do utilizador.

---

# ⚙️ 2. Requisitos Não Funcionais

Os **Requisitos Não Funcionais (NF)** descrevem características de qualidade, desempenho, segurança, disponibilidade e restrições da plataforma.

---

### 🪄 NF01 - Tematização e Imersão

A interface deve possuir uma identidade visual **gamificada e temática**, inspirada no universo de fantasia utilizado pelo projeto.

A interface poderá utilizar elementos como:

* Pergaminhos;
* Poções;
* Elementos mágicos;
* Ícones temáticos;
* Tipografia característica;
* Elementos visuais relacionados às casas e à magia.

O objetivo é proporcionar maior **imersão e identificação do utilizador com a plataforma**.

---

### 📱 NF02 - Portabilidade e Responsividade

O sistema deve ser acessível em diferentes dispositivos, incluindo:

* 💻 Computadores;
* 📱 Smartphones;
* 📲 Tablets.

A interface deve se adaptar automaticamente ao tamanho da tela, mantendo a usabilidade e a identidade visual da plataforma.

---

### 🔒 NF03 - Segurança dos Dados

O sistema deve garantir a proteção dos dados dos utilizadores.

As senhas devem ser armazenadas utilizando métodos seguros de **hashing**, evitando que sejam armazenadas diretamente em texto simples.

O sistema também deve impedir acessos não autorizados às informações pessoais e ao progresso dos utilizadores.

---

### ⚡ NF04 - Desempenho e Eficiência

O sistema deve apresentar respostas rápidas às ações realizadas pelo utilizador.

As principais ações da plataforma, como a validação de questões e atualização da pontuação, devem apresentar resposta em **menos de 2 segundos**, sempre que tecnicamente possível.

O objetivo é evitar interrupções no ritmo da experiência de estudo.

---

### 🌐 NF05 - Disponibilidade

A plataforma deve estar disponível **24 horas por dia**, permitindo que os utilizadores acessem seus conteúdos e realizem suas atividades em qualquer horário.

O sistema deve buscar minimizar períodos de indisponibilidade e garantir o acesso contínuo às funcionalidades essenciais da plataforma.

---
