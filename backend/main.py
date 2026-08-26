from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database.database import engine
from routes import admin_routes, flashcards_routes, usuario_routes, login_routes, questoes_routes

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
app.include_router(questoes_routes.router)
app.include_router(admin_routes.router)
app.include_router(flashcards_routes.router)

# Expõe as imagens das questões (enunciados e alternativas) como arquivos estáticos
PROVAS_DIR = Path(__file__).resolve().parent / "database" / "provas"
if PROVAS_DIR.exists():
    app.mount("/static/provas", StaticFiles(directory=str(PROVAS_DIR)), name="provas")


@app.get("/")
def home():
    return {"mensagem": "API do LumoStudy funcionando"}
