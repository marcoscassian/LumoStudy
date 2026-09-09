from __future__ import annotations

import os

from sqlalchemy.engine import URL, make_url

from config_env import env_bool

MYSQL_CHARSET = os.getenv("MYSQL_CHARSET", "utf8mb4")
DATABASE_URL_ENV = os.getenv("DATABASE_URL", "").strip()


def _normalizar_url(valor: str):
    url = make_url(valor)
    if url.drivername == "mysql":
        url = url.set(drivername="mysql+pymysql")
    return url


if DATABASE_URL_ENV:
    DATABASE_URL_OBJECT = _normalizar_url(DATABASE_URL_ENV)
    MYSQL_HOST = DATABASE_URL_OBJECT.host or "localhost"
    MYSQL_PORT = int(DATABASE_URL_OBJECT.port or 3306)
    MYSQL_USER = DATABASE_URL_OBJECT.username or "root"
    MYSQL_PASSWORD = DATABASE_URL_OBJECT.password or ""
    MYSQL_DATABASE = DATABASE_URL_OBJECT.database or os.getenv("MYSQL_DATABASE", "lumostudy")
    if not DATABASE_URL_OBJECT.database:
        DATABASE_URL_OBJECT = DATABASE_URL_OBJECT.set(database=MYSQL_DATABASE)
    SERVER_URL = DATABASE_URL_OBJECT.set(database=None)
    AUTO_CREATE_DATABASE = env_bool("AUTO_CREATE_DATABASE", False)
    DATABASE_MODE = "remoto/central"
else:
    MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
    MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "admin")
    MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "lumostudy")

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
    AUTO_CREATE_DATABASE = env_bool("AUTO_CREATE_DATABASE", True)
    DATABASE_MODE = "local"

if DATABASE_URL_OBJECT.drivername.startswith("mysql") and "charset" not in DATABASE_URL_OBJECT.query:
    DATABASE_URL_OBJECT = DATABASE_URL_OBJECT.update_query_dict({"charset": MYSQL_CHARSET})

DATABASE_URL = DATABASE_URL_OBJECT.render_as_string(hide_password=False)
