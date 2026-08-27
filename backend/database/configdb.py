"""Configuração única da conexão MySQL do LumoStudy."""

from sqlalchemy.engine import URL

MYSQL_HOST = "localhost"
MYSQL_PORT = 3306
MYSQL_USER = "root"
MYSQL_PASSWORD = ""
MYSQL_DATABASE = "lumostudy"
MYSQL_CHARSET = "utf8mb4"


def _url(database: str | None) -> URL:
    return URL.create(
        drivername="mysql+pymysql",
        username=MYSQL_USER,
        password=MYSQL_PASSWORD or None,
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        database=database,
        query={"charset": MYSQL_CHARSET},
    )


SERVER_URL = _url(None)
DATABASE_URL_OBJECT = _url(MYSQL_DATABASE)
DATABASE_URL = DATABASE_URL_OBJECT.render_as_string(hide_password=False)
