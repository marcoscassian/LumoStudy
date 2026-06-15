from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.database import create_db_and_tables
from routes import usuario_routes, login_routes

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_db_and_tables()

app.include_router(usuario_routes.router)
app.include_router(login_routes.router)


@app.get("/")
def home():
    return {"mensagem": "API do LumoStudy funcionando"}