from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text

DATABASE_URL = "sqlite:///database.db"

engine = create_engine(DATABASE_URL, echo=True)


def get_session():
    with Session(engine) as session:
        yield session


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

    # Garante que tabelas antigas tenham as novas colunas
    # coins, streak e xp.
    with engine.connect() as conn:
        for tbl in ("usuarios", "Usuarios"):
            for col in ("coins", "streak", "xp"):
                try:
                    conn.execute(
                        text(
                            f"ALTER TABLE {tbl} "
                            f"ADD COLUMN {col} INTEGER DEFAULT 0"
                        )
                    )
                    conn.commit()
                except Exception:
                    # A tabela pode não existir ou a coluna já pode existir.
                    continue