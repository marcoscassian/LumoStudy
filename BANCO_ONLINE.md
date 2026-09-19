# Banco online e publicação do LumoStudy

O projeto já aceita MySQL local e MySQL remoto. Para publicar, o ideal é manter **um único backend online** conectado ao banco remoto. Os computadores dos colegas acessam o backend pela URL pública e **não precisam receber a senha do MySQL**.

## 1. Variáveis do backend

No serviço onde o backend for hospedado, configure as variáveis de ambiente em vez de enviar `backend/.env` para o GitHub:

```env
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
AUTO_CREATE_DATABASE=false
JWT_SECRET=UMA_CHAVE_LONGA_E_ALEATORIA
FRONTEND_URL=https://SEU-FRONTEND
CORS_ORIGINS=https://SEU-FRONTEND

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=lumostudy934@gmail.com
EMAIL_PASSWORD=SENHA_DE_APP_DO_GOOGLE
EMAIL_FROM_NAME=LumoStudy
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
RESET_TOKEN_MINUTES=30
```

Se o provedor do MySQL exigir certificado CA, adicione também:

```env
MYSQL_SSL_CA=/caminho/para/ca.pem
MYSQL_SSL_VERIFY=true
```

O caminho do CA só pertence ao servidor que executa o backend. Os usuários do site não precisam dele.

## 2. Variável do frontend

No serviço onde o Next.js for hospedado:

```env
NEXT_PUBLIC_API_URL=https://URL-PUBLICA-DO-BACKEND
```

O backend já aceita `FRONTEND_URL` e `CORS_ORIGINS` para liberar a origem do frontend.

## 3. Inicialização do banco

Ao iniciar, o backend:

1. testa/cria o banco conforme `AUTO_CREATE_DATABASE`;
2. aplica todas as migrations do Alembic até o `head`;
3. sincroniza áreas, temas, provas, questões, simulados e itens da loja.

Em banco gerenciado, mantenha `AUTO_CREATE_DATABASE=false`, pois normalmente o schema já é fornecido pelo provedor.

## 4. Teste de saúde

Depois de publicar o backend, abra:

```text
https://URL-DO-BACKEND/health
```

Se a API e o MySQL estiverem acessíveis, a resposta será:

```json
{"status":"ok","database":"ok"}
```

## 5. Recuperação de senha

O link enviado por e-mail usa `FRONTEND_URL`. Portanto, em produção ela precisa apontar para o endereço real do site, e não para `localhost`.

O Gmail precisa aceitar a autenticação SMTP da conta. Use uma **senha de app** válida e nunca envie `EMAIL_PASSWORD` ao GitHub.

## 6. Arquivos que não devem ir para o GitHub

Não publique:

- `backend/.env`;
- `frontend/.env.local`;
- certificados privados ou arquivos `.pem` que contenham segredo;
- `node_modules`;
- ambientes virtuais (`env`, `.venv`).

Os arquivos `.env.example` ficam no repositório apenas como modelo, sem senhas reais.
