from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.database import engine
from routes import usuario_routes, login_routes

from alembic import command
from alembic.config import Config

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Aplica as migrações pendentes do banco de dados
alembic_cfg = Config("alembic.ini")
command.upgrade(alembic_cfg, "head")

app.include_router(usuario_routes.router)
app.include_router(login_routes.router)


@app.get("/")
def home():
    return {"mensagem": "API do LumoStudy funcionando"}