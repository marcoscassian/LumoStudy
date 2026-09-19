# Personalização — cursos, casas, avatares e mascotes

## Curso → casa

O curso é escolhido no cadastro e passa a ser a identidade visual fixa da conta.

| Curso | Casa | Cor principal |
|---|---|---|
| Informática | Grifinória | Vermelho |
| Eletro | Sonserina | Verde |
| Vestuário | Corvinal | Azul |
| Têxtil | Lufa-Lufa | Amarelo |

O mapeamento fica centralizado em:

- backend: `backend/services/identidade_service.py`
- frontend: `frontend/app/lib/identidade.ts`

Se a equipe decidir trocar a correspondência no futuro, altere esses dois arquivos mantendo os mesmos slugs.

## 16 fotos de perfil

Cada casa possui quatro versões dos desenvolvedores. O usuário vê na Loja e nas Configurações somente as quatro imagens da própria casa.

Estrutura:

```text
frontend/public/loja/avatares/
├── corvinal/
│   ├── ludimila.png
│   ├── icaro.png
│   ├── alex.png
│   └── marcos.png
├── grifinoria/
├── sonserina/
└── lufa-lufa/
```

As 16 imagens provisórias já existem para o site não quebrar. Para colocar as artes finais, basta substituir os PNGs mantendo os mesmos nomes e pastas.

O avatar não altera a casa. A casa é definida pelo curso.

## Mascotes / sprites

A coruja é o mascote padrão e gratuito, e também usa sprite em pixel art. Os outros mascotes são itens compráveis da Loja:

- `coruja.png`
- `gato.png`
- `sapo.png`
- `rato.png`
- `serpente.png`

Todos ficam em:

```text
frontend/public/sprites/mascotes/
```

### Formato das spritesheets

O sistema agora aceita uma quantidade variável de frames. Para manter o padrão das artes novas, use **96×96 px por frame**, exatamente como a coruja enviada.

Cada mascote terá duas spritesheets:

- versão normal: **6 frames** (`576×96`), por exemplo `coruja.png`;
- versão com carta/notificação: **5 frames** (`480×96`), por exemplo `corujan.png`.

Convenção pronta para os próximos animais:

- `gato.png` / `gaton.png`;
- `sapo.png` / `sapon.png`;
- `rato.png` / `raton.png`;
- `serpente.png` / `serpenten.png`.

Se a versão `*n.png` ainda não existir, o site usa automaticamente a animação normal do animal sem quebrar a interface.

O componente `frontend/app/components/mascot-sprite.js` já aceita quantidades diferentes de frames e redimensiona a spritesheet automaticamente.

## Notificações

O mascote aparece animado na barra lateral. Sem notificações não lidas, ele usa a versão normal. Quando existe pelo menos uma notificação não lida, ele troca para a versão com carta (`*n.png`). Ao clicar no mascote:

- abre uma carta mágica no centro da tela;
- escurece e desfoca o fundo;
- usa proporção semelhante a uma folha A4;
- mostra o contador de não lidas;
- permite abrir uma notificação;
- permite marcar todas como lidas.

As notificações são persistidas no MySQL pela tabela `notificacoes`.

Novas contas recebem automaticamente uma carta de boas-vindas. Compras na Loja também geram uma notificação. O painel Admin também pode enviar uma mensagem diretamente para um usuário. A barra lateral verifica novas notificações periodicamente, então a animação com carta aparece sem exigir recarregar a página.

## Banco

A migration `0011_cursos_avatares_mascotes_notificacoes.py` adiciona:

- `usuarios.curso`;
- `usuarios.mascote_slug`;
- `usuarios.mascote_url`;
- tabela `notificacoes`.

Ela também permite manter avatar e mascote equipados simultaneamente, porque a lógica da Loja desequipa apenas itens do mesmo tipo.

## Cor do aplicativo: roxo padrão ou casa

A casa continua sendo definida pelo curso e controla quais avatares pertencem ao usuário. Em **Configurações → Aparência**, o usuário pode escolher a cor visual do aplicativo entre:

- **Roxo padrão** — mantém a identidade clássica roxa do LumoStudy;
- **Cor da sua casa** — usa a cor da casa vinculada ao curso.

Essa escolha fica salva em `usuarios.tema_roxo_padrao`. Ela muda apenas a aparência: não altera curso, casa, avatares ou mascotes.
