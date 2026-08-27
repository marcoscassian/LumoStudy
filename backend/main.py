from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database.createdb import inicializar_banco
from routes import (
    admin_routes,
    flashcards_routes,
    login_routes,
    questoes_routes,
    simulados_routes,
    trilha_routes,
    usuario_routes,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Não é mais necessário executar createdb.py manualmente.
    # Ao iniciar o backend, ele cria o banco MySQL caso não exista, aplica
    # todas as migrations e sincroniza as questões/simulados automaticamente.
    provas, questoes, simulados = inicializar_banco()
    print(
        f"LumoStudy pronto: {provas} provas, {questoes} questões e "
        f"{simulados} simulados sincronizados no MySQL."
    )
    yield


app = FastAPI(title="LumoStudy API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuario_routes.router)
app.include_router(login_routes.router)
app.include_router(questoes_routes.router)
app.include_router(admin_routes.router)
app.include_router(flashcards_routes.router)
app.include_router(trilha_routes.router)
app.include_router(simulados_routes.router)

# Os JSONs continuam sendo a fonte dos enunciados e das imagens.
PROVAS_DIR = Path(__file__).resolve().parent / "database" / "provas"
if PROVAS_DIR.exists():
    app.mount("/static/provas", StaticFiles(directory=str(PROVAS_DIR)), name="provas")


@app.get("/")
def home():
    return {"mensagem": "API do LumoStudy funcionando com MySQL"}

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
