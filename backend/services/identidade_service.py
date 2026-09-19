from __future__ import annotations

from fastapi import HTTPException

# Mapeamento central. Se a equipe quiser trocar qual curso pertence a qual casa,
# basta alterar este dicionário; cadastro, tema e loja usam a mesma fonte.
CURSOS_CASAS = {
    "informatica": {"nome": "Informática", "casa": "grifinoria"},
    "eletro": {"nome": "Eletro", "casa": "sonserina"},
    "vestuario": {"nome": "Vestuário", "casa": "corvinal"},
    "textil": {"nome": "Têxtil", "casa": "lufa-lufa"},
}

NOMES_CASAS = {
    "corvinal": "Corvinal",
    "grifinoria": "Grifinória",
    "sonserina": "Sonserina",
    "lufa-lufa": "Lufa-Lufa",
}


def normalizar_curso(curso: str | None) -> str:
    valor = str(curso or "").strip().lower()
    if valor not in CURSOS_CASAS:
        raise HTTPException(status_code=400, detail="Selecione um curso válido do IFRN Campus Caicó")
    return valor


def casa_do_curso(curso: str | None) -> str:
    curso_normalizado = normalizar_curso(curso)
    return CURSOS_CASAS[curso_normalizado]["casa"]


def nome_curso(curso: str | None) -> str:
    curso_normalizado = normalizar_curso(curso)
    return CURSOS_CASAS[curso_normalizado]["nome"]
