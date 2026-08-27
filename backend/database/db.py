from sqlmodel import Session, create_engine

from database.configdb import DATABASE_URL_OBJECT

engine = create_engine(
    DATABASE_URL_OBJECT,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
)


def get_session():
    with Session(engine) as session:
        yield session
