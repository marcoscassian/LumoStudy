<<<<<<< HEAD
from sqlmodel import Session, create_engine
=======
from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
>>>>>>> 18e56acbc2671cebd20cec0eaae5abe03cdfc422

DATABASE_URL = "sqlite:///database.db"

engine = create_engine(DATABASE_URL, echo=True)

<<<<<<< HEAD

def get_session():
    with Session(engine) as session:
        yield session
=======
def get_session():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

    # Ensure older tables have the new columns (coins, streak, xp)
    with engine.connect() as conn:
        # Attempt to add missing columns to known user table names. Ignore errors if column already exists.
        for tbl in ("usuarios", "Usuarios"):
            for col in ("coins", "streak", "xp"):
                try:
                    conn.execute(text(f"ALTER TABLE {tbl} ADD COLUMN {col} INTEGER DEFAULT 0"))
                except Exception:
                    # Likely the table doesn't exist yet or column already present — ignore and continue
                    continue
>>>>>>> 18e56acbc2671cebd20cec0eaae5abe03cdfc422
