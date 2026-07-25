# LumoStudy — Contexto Oficial do Projeto

> Este documento define toda a arquitetura, filosofia, padrões e regras do projeto LumoStudy.
>
> Antes de implementar qualquer funcionalidade, considere este documento como a única fonte de verdade.
>
> Nenhuma implementação deve contrariar qualquer regra definida aqui.

---

# O Produto

O LumoStudy é uma plataforma SaaS de preparação para o ENEM.

Seu objetivo NÃO é apenas oferecer questões.

Também NÃO é apenas uma plataforma de resumos.

O objetivo é criar um ecossistema completo de aprendizagem.

Todo o sistema gira em torno da Trilha de Estudos.

---

# Stack

Frontend

- Next.js 15
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- TanStack Query

Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- JWT
- Pydantic

Banco

PostgreSQL

Arquitetura

DDD

Repository Pattern

Service Layer

REST API

---

# Filosofia

O sistema possui dois modos de estudo.

## Estudo Guiado

O aluno segue uma jornada organizada pela plataforma.

## Estudo Livre

O aluno pode acessar diretamente

- Questões
- Flashcards
- Simulados

Além disso pode criar

- Listas personalizadas
- Simulados personalizados
- Flashcards personalizados

Mesmo estudando livremente o usuário continua recebendo

XP

Moedas

Conquistas

Streak

Porém o progresso da trilha só avança quando as missões forem concluídas.

---

# O Núcleo

A Trilha é o núcleo.

Ela NÃO armazena conteúdo.

Ela apenas organiza conteúdo.

Todo conteúdo pertence ao banco central.

A trilha apenas define

o que estudar

quando estudar

quando revisar

qual tema vem depois.

---

# Estrutura da Trilha

ENEM

↓

Áreas

↓

Disciplinas

↓

Módulos

↓

Temas

↓

Resumo

↓

Questões

↓

Flashcards

↓

Revisão

↓

Conclusão

---

# Áreas

Existem apenas quatro.

Linguagens

Ciências Humanas

Matemática

Ciências da Natureza

Nunca adicionar novas áreas.

---

# Disciplinas

## Linguagens

Português

Literatura

Inglês

Espanhol

Artes

---

## Natureza

Biologia

Química

Física

---

## Humanas

História

Geografia

Filosofia

Sociologia

---

## Matemática

Matemática

---

# Cada Tema possui

Nome

Descrição

Resumo

XP

Quantidade de Questões

Quantidade de Flashcards

Prioridade ENEM

Tempo estimado

Pré-requisitos

Status

---

# Status possíveis

LOCKED

AVAILABLE

IN_PROGRESS

COMPLETED

REVIEW

---

# Missão

Todo tema possui uma missão.

A missão possui objetivos.

Exemplo

☐ Ler resumo

☐ Resolver questões

☐ Acertar pelo menos 70%

☐ Revisar Flashcards

☐ Concluir

Somente após todos os objetivos o tema será concluído.

---

# Sistema de Revisão

Todo tema concluído entra automaticamente na fila de revisão.

Revisões

3 dias

7 dias

15 dias

30 dias

60 dias

Utilizar repetição espaçada.

---

# Sistema de XP

Cada tema gera XP.

Quanto maior a prioridade ENEM.

Maior o XP.

Quanto maior a dificuldade.

Maior o XP.

---

# Sistema de Estrelas

★★★★★

Assunto extremamente recorrente no ENEM.

★★★★☆

Muito recorrente.

★★★☆☆

Recorrência média.

★★☆☆☆

Pouco recorrente.

★☆☆☆☆

Baixa recorrência.

Nunca utilizar estrelas apenas como decoração.

Elas influenciam

XP

Prioridade

Recomendação

Ordem da Trilha

---

# Banco Central

Questões

Flashcards

Resumos

Todos pertencem ao banco central.

Nunca criar cópias.

Sempre reutilizar.

---

# Questões

Uma questão pertence a um Tema.

Campos

Área

Disciplina

Módulo

Tema

Competência ENEM

Habilidade ENEM

Ano

Fonte

Dificuldade

Tempo Médio

Tags

---

# Flashcards

Tema

Pergunta

Resposta

Nível

Última Revisão

Acertos

Erros

---

# Simulados

São independentes.

Podem utilizar qualquer questão do banco.

---

# Tela da Trilha

A primeira tela mostra apenas

Linguagens

Humanas

Matemática

Natureza

Ao clicar

abre disciplinas

Ao clicar

abre módulos

Ao clicar

abre temas

Sem trocar de página.

Toda navegação é dinâmica.

---

# Página do Tema

Cabeçalho

Resumo

Questões

Flashcards

Estatísticas

Missão

Botão concluir

Próximo tema

---

# Sistema de Desbloqueio

Tema 2 depende da conclusão do Tema 1.

Nunca permitir pular conteúdos da trilha.

O estudo livre continua disponível.

---

# Recompensas

XP

Moedas

Estrelas

Conquistas

Tudo alimenta

Perfil

Ranking

Loja

---

# Design

Minimalista.

Dark Mode.

Muito parecido com

Linear

Notion

Duolingo

GitHub

Nada colorido excessivamente.

Muito espaço em branco.

Animações discretas.

Microinterações.

---

# Código

Sempre utilizar

TypeScript

Componentização

Hooks

Services

Repository

Nunca escrever lógica diretamente nos componentes.

---

# Estrutura

Feature First

/src

/features

/components

/services

/hooks

/types

/lib

/app

Nunca utilizar arquivos gigantes.

---

# Qualidade

Todo código deve ser

Escalável

Limpo

Documentado

Tipado

Reutilizável

---

# Resposta da IA

Sempre responder nesta ordem

1 Arquitetura

2 Banco

3 Backend

4 Frontend

5 Componentes

6 APIs

7 Fluxos

8 Código

9 Testes

Nunca responder apenas com explicações.

Sempre implementar.

Sempre entregar código funcional.

Sempre pensar como um engenheiro de software sênior.

Nunca criar soluções simplificadas apenas para funcionar.

Todo código deve estar pronto para produção.