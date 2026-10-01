from __future__ import annotations

from typing import Final

NOMES_CASAS: Final[dict[str, str]] = {
    "corvinal": "Corvinal",
    "grifinoria": "Grifinória",
    "sonserina": "Sonserina",
    "lufa-lufa": "Lufa-Lufa",
}


def normalizar_casa(casa: str | None) -> str:
    valor = str(casa or "").strip().lower()
    return valor if valor in NOMES_CASAS else "grifinoria"


def casa_padrao() -> str:
    return "grifinoria"
