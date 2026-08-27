# Banco e migrations do LumoStudy

O banco definitivo do projeto é **MySQL**.

Configuração atual:

- host: `localhost`
- porta: `3306`
- usuário: `root`
- senha: vazia
- banco: `lumostudy`
- charset: `utf8mb4`

A configuração fica em `database/configdb.py` e a conexão usada pela API em `database/db.py`.

## Primeira instalação

Na pasta `backend`:

```cmd
py -m venv env
env\Scripts\activate
pip install -r requirements.txt
python database\createdb.py
```

`createdb.py`:

1. cria/verifica o banco `lumostudy`;
2. executa `alembic upgrade head`;
3. cadastra as quatro áreas e os temas base;
4. indexa as provas e as questões dos JSONs locais no MySQL;
5. cria cinco modelos iniciais de simulado.

Depois inicie a API:

```cmd
python -m uvicorn main:app --reload --port 8000
```

## Alterações futuras nos models

Não use `SQLModel.metadata.create_all()` nem `ALTER TABLE` manual para atualizar o schema.

Depois de alterar `models/models.py`:

```cmd
alembic revision --autogenerate -m "descricao da alteracao"
alembic upgrade head
```

As migrations devem ser commitadas em `migrations/versions/`.
