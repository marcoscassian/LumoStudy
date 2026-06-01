from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

conn = sqlite3.connect("database.db", check_same_thread=False)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT
)
""")

conn.commit()


class User(BaseModel):
    username: str
    email: str
    password: str


class LoginData(BaseModel):
    email: str
    password: str


@app.get("/")
def home():
    return {"msg": "API funcionando"}


@app.post("/register")
def register(user: User):
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (user.username, user.email, user.password)
        )

        conn.commit()

        return {"message": "Usuário cadastrado"}

    except:
        return {"error": "Email já existe"}


@app.post("/login")
def login(data: LoginData):

    cursor.execute(
        "SELECT * FROM users WHERE email = ? AND password = ?",
        (data.email, data.password)
    )

    user = cursor.fetchone()

    if user:
        return {"message": "Login realizado"}

    return {"error": "Email ou senha inválidos"}