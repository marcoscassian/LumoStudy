# Migrações do banco — LumoStudy

O projeto usa **Alembic + SQLModel**. A estrutura do banco não deve mais ser
criada ou alterada com `SQLModel.metadata.create_all()` nem com `ALTER TABLE`
manual no código da aplicação.

## Instalar

```bash
pip install -r requirements.txt
```

## Aplicar as migrations

```bash
alembic upgrade head
```

## Criar uma migration depois de alterar os modelos

```bash
alembic revision --autogenerate -m "descricao_da_alteracao"
```

Sempre revise o arquivo gerado antes de aplicar.

## Aplicar

```bash
alembic upgrade head
```

## Desfazer a última migration

```bash
alembic downgrade -1
```

## Ver histórico

```bash
alembic history
alembic current
```

Toda migration criada em `migrations/versions/` deve ser versionada no Git.
