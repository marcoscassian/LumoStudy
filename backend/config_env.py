from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
ENV_PATH = BACKEND_DIR / ".env"


def carregar_env() -> None:
    if not ENV_PATH.exists():
        return

    for linha in ENV_PATH.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue

        chave, valor = linha.split("=", 1)
        chave = chave.strip()
        valor = valor.strip()

        if len(valor) >= 2 and valor[0] == valor[-1] and valor[0] in {"\"", "'"}:
            valor = valor[1:-1]

        if chave:
            os.environ[chave] = valor


def env_bool(nome: str, padrao: bool = False) -> bool:
    valor = os.getenv(nome)
    if valor is None:
        return padrao
    return valor.strip().lower() in {"1", "true", "sim", "yes", "on"}


carregar_env()
