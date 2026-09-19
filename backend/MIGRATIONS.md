# Banco e migrations do LumoStudy

O banco definitivo do projeto é **MySQL**. A conexão é configurada por variáveis de ambiente; não há senha fixa no código.

## Desenvolvimento local

Copie `backend/.env.example` para `backend/.env` e ajuste, por exemplo:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=SUA_SENHA
MYSQL_DATABASE=lumostudy
MYSQL_CHARSET=utf8mb4
AUTO_CREATE_DATABASE=true
```

A configuração fica em `database/configdb.py` e a conexão usada pela API em `database/db.py`.

## Banco online

Para MySQL remoto/gerenciado, prefira:

```env
DATABASE_URL=mysql+pymysql://USUARIO:SENHA@HOST:PORTA/NOME_DO_BANCO
AUTO_CREATE_DATABASE=false
```

Se o provedor exigir certificado CA:

```env
MYSQL_SSL_CA=C:/caminho/para/ca.pem
MYSQL_SSL_VERIFY=true
```

Veja também `../BANCO_ONLINE.md`.

## Inicialização automática

Não é obrigatório executar `database/createdb.py` antes de iniciar o backend.

Ao executar, na pasta `backend`:

```cmd
python -m uvicorn main:app --reload --port 8000
```

ou:

```cmd
python main.py
```

o FastAPI executa automaticamente, antes de aceitar requisições:

1. criação/verificação do banco quando permitido por `AUTO_CREATE_DATABASE`;
2. `alembic upgrade head`;
3. cadastro das quatro áreas e dos temas base;
4. indexação das provas e questões dos JSONs locais;
5. criação/sincronização dos simulados;
6. criação dos itens da loja;
7. criação das metas padrão dos usuários existentes.

`python database\createdb.py` continua disponível para inicialização/sincronização manual.

## Primeira instalação

Na pasta `backend`:

```cmd
py -m venv env
env\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

O MySQL local precisa estar iniciado no host/porta configurados no `.env`.

## Alterações futuras nos models

Não use `SQLModel.metadata.create_all()` nem `ALTER TABLE` manual para atualizar o schema.

Depois de alterar `models/models.py`:

```cmd
alembic revision --autogenerate -m "descricao da alteracao"
alembic upgrade head
```

As migrations devem ser commitadas em `migrations/versions/`.

## 0011 — cursos, avatares por casa, mascotes e notificações

A migration `0011` adiciona `curso`, `mascote_slug` e `mascote_url` aos usuários e cria a tabela `notificacoes`.

Depois dela, a casa passa a ser definida pelo curso e não pela foto de perfil. A inicialização sincroniza os 16 slots de avatar e os mascotes da Loja automaticamente.
