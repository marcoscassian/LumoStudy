from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

<<<<<<< HEAD
from database.database import engine
from routes import usuario_routes, login_routes
from alembic import command
from alembic.config import Config
=======
from database.database import create_db_and_tables
from routes import usuario_routes, login_routes
>>>>>>> 18e56acbc2671cebd20cec0eaae5abe03cdfc422

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
# Apply any pending database migrations before serving the API.
alembic_cfg = Config("alembic.ini")
command.upgrade(alembic_cfg, "head")
=======
create_db_and_tables()
>>>>>>> 18e56acbc2671cebd20cec0eaae5abe03cdfc422

app.include_router(usuario_routes.router)
app.include_router(login_routes.router)


@app.get("/")
def home():
    return {"mensagem": "API do LumoStudy funcionando"}