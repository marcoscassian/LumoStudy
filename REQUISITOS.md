# Requisitos do Sistema

## Requisitos Funcionais (RF)

Os requisitos funcionais descrevem as funcionalidades que o sistema deve oferecer para que o utilizador consiga estudar e interagir com a plataforma temática.

---

### RF01 - Cadastro de Usuários

**Descrição:**
Permitir que novos utilizadores criem uma conta para salvar o seu progresso nas trilhas e poções.

**Prioridade:** Obrigatório

**Entrada e condição anterior:**
O utilizador não deve possuir uma conta ativa. O sistema deve solicitar os seguintes dados:

* Nome de utilizador (ou nome de bruxo);
* E-mail;
* Senha segura.

**Saída e condição posterior:**
Conta criada com sucesso e armazenamento dos dados no banco de dados.

---

### RF02 - Realizar Login

**Descrição:**
Permitir o acesso de utilizadores já cadastrados.

**Prioridade:** Obrigatório

**Entrada e condição anterior:**
E-mail e senha válidos.

**Saída e condição posterior:**
Utilizador autenticado com acesso ao seu progresso e perfil.

---

### RF03 - Realizar Logout

**Descrição:**
Permitir que o utilizador encerre a sessão da conta associada.

**Prioridade:** Obrigatório

**Entrada e condição anterior:**
Utilizador estar logado e clicar na opção de sair.

**Saída e condição posterior:**
Sessão encerrada e retorno à tela de autenticação.

---

### RF04 - Recuperação de Senha

**Descrição:**
Disponibilizar uma funcionalidade para redefinir o acesso caso o utilizador esqueça a senha.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
E-mail cadastrado pelo utilizador.

**Saída e condição posterior:**
Envio de link de redefinição para o e-mail e possibilidade de criar uma nova senha.

---

### RF05 - Trilha de Aprendizado

**Descrição:**
Permitir a visualização estruturada dos conteúdos, organizados em módulos ou anos letivos de forma sequencial.

**Prioridade:** Obrigatório

**Entrada e condição anterior:**
Acesso à área de conteúdos.

**Saída e condição posterior:**
Exibição do progresso do utilizador e dos próximos temas disponíveis.

---

### RF06 - Lista de Questões

**Descrição:**
Permitir a resolução de exercícios com feedback imediato após cada resposta.

**Prioridade:** Obrigatório

**Entrada e condição anterior:**
Seleção de um tema da trilha de aprendizado.

**Saída e condição posterior:**
Exibição do resultado da questão, indicando acerto ou erro, juntamente com a pontuação obtida.

---

### RF07 - Perfil do Utilizador

**Descrição:**
Disponibilizar um espaço com informações pessoais e estatísticas do utilizador.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
Dados do utilizador, como nome, foto ou "Casa".

**Saída e condição posterior:**
Exibição e possibilidade de edição das informações do perfil.

---

### RF08 - FlashCards

**Descrição:**
Disponibilizar um método de revisão baseado em cartões de memória para auxiliar na fixação dos conteúdos.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
Seleção de um deck (baralho) de cartas.

**Saída e condição posterior:**
Registro do desempenho do utilizador para auxiliar no processo de repetição espaçada.

---

### RF09 - Simulados Cronometrados

**Descrição:**
Permitir a realização de avaliações com tempo limitado e exibir o resultado somente ao final do teste.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
Início do cronômetro pelo utilizador.

**Saída e condição posterior:**
Exibição de um relatório final de desempenho após o término do simulado.

---

### RF10 - Streak (Foguinho)

**Descrição:**
Registrar a frequência diária de estudos para incentivar a constância do utilizador.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
Utilizador autenticado e realização de pelo menos uma atividade no dia.

**Saída e condição posterior:**
Atualização visual do contador de dias consecutivos de atividade.

---

### RF11 - Sistema de Competição (Ranking)

**Descrição:**
Disponibilizar um ranking entre os utilizadores para tornar o processo de estudo mais interativo e divertido.

**Prioridade:** Recomendado

**Entrada e condição anterior:**
Pontuação acumulada pelo utilizador.

**Saída e condição posterior:**
Exibição da posição do utilizador em comparação com outros bruxos/estudantes.

---

### RF12 - Definição de Metas

**Descrição:**
Permitir que o utilizador defina objetivos diários, como tempo de estudo ou quantidade de questões.

**Prioridade:** Opcional

**Entrada e condição anterior:**
Inserção do valor da meta pelo utilizador, como, por exemplo, 20 minutos de estudo.

**Saída e condição posterior:**
Exibição de uma barra de progresso visual indicando o nível de conclusão da meta.

---

### RF13 - Loja de Itens Virtuais

**Descrição:**
Permitir a troca de moedas virtuais obtidas durante os estudos por itens cosméticos ou "poções" de recuperação.

**Prioridade:** Opcional

**Entrada e condição anterior:**
Utilizador possuir saldo suficiente de moedas virtuais.

**Saída e condição posterior:**
Item adquirido e adicionado ao inventário do utilizador.

---

# Requisitos Não Funcionais (NF)

Os requisitos não funcionais descrevem as características de qualidade do sistema, suas restrições e aspectos relacionados à experiência de utilização.

---

### NF01 - Tematização e Imersão (Interface)

A interface deve ser gamificada e inspirada visualmente no universo de Harry Potter, utilizando elementos como pergaminhos, poções e fontes características para garantir a imersão temática.

---

### NF02 - Portabilidade e Responsividade

O sistema deve ser acessível em computadores e dispositivos móveis, como tablets e smartphones, ajustando automaticamente a interface temática de acordo com o tamanho da tela.

---

### NF03 - Segurança dos Dados

O sistema deve garantir que as senhas sejam armazenadas de forma segura e criptografada, impedindo o acesso não autorizado aos dados pessoais dos utilizadores.

---

### NF04 - Desempenho e Eficiência

O sistema deve responder às ações de gamificação, como a validação de questões, em menos de **2 segundos**, evitando interrupções no ritmo da experiência do utilizador.

---

### NF05 - Disponibilidade

Por ser uma plataforma de estudos, o sistema deve estar disponível **24 horas por dia**, permitindo que o utilizador realize suas atividades e metas diárias em qualquer horário.
