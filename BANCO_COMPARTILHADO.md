# Banco compartilhado entre computadores

## Por que as contas somem quando o projeto é baixado em outro PC?

O GitHub salva os **arquivos do projeto**, mas o MySQL salva os dados em um **servidor de banco de dados separado**. Por isso, `localhost` significa "o MySQL deste computador". Cada PC usando `localhost` possui um banco diferente.

Não é correto colocar os arquivos internos do MySQL ou um dump com contas/senhas no GitHub.

## Como fazer todas as contas continuarem existindo em qualquer PC

O LumoStudy agora aceita a variável `DATABASE_URL`. Para compartilhar contas, progresso, moedas, ranking, loja e tudo mais, todos os backends devem apontar para **o mesmo MySQL remoto/central**.

Exemplo em `backend/.env`:

```env
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@HOST:3306/lumostudy?charset=utf8mb4
AUTO_CREATE_DATABASE=false
```

Quando `DATABASE_URL` estiver definida:

1. o backend usa o banco remoto em vez do MySQL local;
2. as migrations do Alembic continuam sendo aplicadas automaticamente ao iniciar;
3. todas as contas ficam no mesmo banco;
4. um usuário criado em um computador aparece em qualquer outro computador conectado a esse mesmo banco.

## Melhor arquitetura para uso real

A forma mais simples é deixar **um backend FastAPI hospedado** e **um MySQL hospedado**. O frontend de todos os usuários acessa esse mesmo backend. Nesse caso, configure no frontend:

```env
NEXT_PUBLIC_API_URL=https://URL-DO-SEU-BACKEND
```

Assim os usuários não precisam ter MySQL instalado nem conhecer a senha do banco.

## Importante

O código está pronto para banco remoto, mas é necessário criar/hospedar esse MySQL em algum servidor. Sem um servidor central, dois computadores diferentes usando `localhost` nunca terão automaticamente os mesmos dados.
