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

## Inicialização automática

Não é mais obrigatório executar `database/createdb.py` antes de iniciar o backend.

Ao executar:

```cmd
python -m uvicorn main:app --reload --port 8000
```

ou simplesmente:

```cmd
python main.py
```

o FastAPI executa automaticamente, antes de aceitar requisições:

1. criação/verificação do banco `lumostudy`;
2. `alembic upgrade head`;
3. cadastro das quatro áreas e dos temas base;
4. indexação das provas e questões dos JSONs locais;
5. criação dos simulados iniciais;
6. criação das metas padrão dos usuários existentes.

`python database\createdb.py` continua disponível caso seja necessário inicializar/sincronizar o banco manualmente.

## Primeira instalação

Na pasta `backend`:

```cmd
py -m venv env
env\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

O MySQL precisa estar iniciado em `localhost:3306` e o usuário `root` deve aceitar conexão sem senha, conforme `database/configdb.py`.

## Alterações futuras nos models

Não use `SQLModel.metadata.create_all()` nem `ALTER TABLE` manual para atualizar o schema.

Depois de alterar `models/models.py`:

```cmd
alembic revision --autogenerate -m "descricao da alteracao"
alembic upgrade head
```

As migrations devem ser commitadas em `migrations/versions/`.
