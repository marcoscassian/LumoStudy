from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import Session, select

from database.database import get_session
from models.models import Flashcard, QuestaoEditorial
from routes.login_routes import AdminLogado
from routes.questoes_routes import (
    _ler_json_questao,
    _listar_provas,
    _montar_questao_original,
    _pastas_de_questoes,
)

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/admin", tags=["admin"])


def _prova_do_ano(ano: int) -> str:
    prova = f"ENEM{ano}"
    if prova not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    return prova


def _validar_questao(prova: str, numero: str) -> dict:
    numero = str(numero).strip()
    if numero not in _pastas_de_questoes(prova):
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return _ler_json_questao(prova, numero)


class QuestaoEditorialPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    resolucao: str | None = Field(default=None, max_length=20000)
    disciplina: str | None = Field(default=None, max_length=100)
    conteudo_principal: str | None = Field(default=None, max_length=150)

    @field_validator("resolucao", "disciplina", "conteudo_principal")
    @classmethod
    def vazio_vira_nulo(cls, valor: str | None):
        return valor or None


class FlashcardPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    frente: str = Field(min_length=1, max_length=5000)
    verso: str = Field(min_length=1, max_length=10000)
    disciplina: str = Field(min_length=1, max_length=100)
    conteudo_principal: str = Field(min_length=1, max_length=150)
    prova: str | None = Field(default=None, max_length=30)
    numero_questao: str | None = Field(default=None, max_length=30)
    ativo: bool = True

    @field_validator("prova", "numero_questao")
    @classmethod
    def vazio_vira_nulo(cls, valor: str | None):
        return valor or None


@router.get("/me")
def admin_atual(admin: AdminLogado):
    return {"id": admin.id, "nome": admin.nome, "email": admin.email, "is_admin": True}


@router.get("/provas")
def listar_provas_admin(admin: AdminLogado):
    provas = _listar_provas()
    return [
        {"prova": prova, "ano": int(prova.removeprefix("ENEM"))}
        for prova in sorted(provas, reverse=True)
        if prova.removeprefix("ENEM").isdigit()
    ]


@router.get("/questoes/buscar")
def buscar_questao(
    admin: AdminLogado,
    session: SessionDep,
    ano: int = Query(..., ge=1990, le=2200),
    numero: str = Query(..., min_length=1, max_length=30),
):
    prova = _prova_do_ano(ano)
    dados = _validar_questao(prova, numero)
    editorial = session.exec(
        select(QuestaoEditorial).where(
            QuestaoEditorial.prova == prova,
            QuestaoEditorial.numero == numero,
        )
    ).first()
    return {
        "original": _montar_questao_original(prova, numero, dados),
        "editorial": editorial,
    }


@router.put("/questoes/{prova}/{numero}/editorial")
def salvar_editorial(
    prova: str,
    numero: str,
    payload: QuestaoEditorialPayload,
    admin: AdminLogado,
    session: SessionDep,
):
    if prova not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    _validar_questao(prova, numero)

    editorial = session.exec(
        select(QuestaoEditorial).where(
            QuestaoEditorial.prova == prova,
            QuestaoEditorial.numero == numero,
        )
    ).first()
    agora = datetime.now()
    if editorial is None:
        editorial = QuestaoEditorial(prova=prova, numero=numero, criado_em=agora)

    editorial.resolucao = payload.resolucao
    editorial.disciplina = payload.disciplina
    editorial.conteudo_principal = payload.conteudo_principal
    editorial.atualizado_por = admin.id
    editorial.atualizado_em = agora
    session.add(editorial)
    session.commit()
    session.refresh(editorial)
    return editorial


def _validar_vinculo_flashcard(payload: FlashcardPayload):
    if bool(payload.prova) != bool(payload.numero_questao):
        raise HTTPException(
            status_code=400,
            detail="Informe prova e número da questão juntos",
        )
    if payload.prova:
        if payload.prova not in _listar_provas():
            raise HTTPException(status_code=404, detail="Prova vinculada não encontrada")
        _validar_questao(payload.prova, payload.numero_questao or "")


@router.get("/flashcards")
def listar_flashcards_admin(
    admin: AdminLogado,
    session: SessionDep,
    busca: str | None = None,
    disciplina: str | None = None,
    ativo: bool | None = None,
):
    consulta = select(Flashcard)
    if busca:
        termo = f"%{busca.strip()}%"
        consulta = consulta.where((Flashcard.frente.ilike(termo)) | (Flashcard.verso.ilike(termo)))
    if disciplina:
        consulta = consulta.where(Flashcard.disciplina == disciplina)
    if ativo is not None:
        consulta = consulta.where(Flashcard.ativo == ativo)
    return session.exec(consulta.order_by(Flashcard.atualizado_em.desc())).all()


@router.post("/flashcards", status_code=201)
def criar_flashcard(payload: FlashcardPayload, admin: AdminLogado, session: SessionDep):
    _validar_vinculo_flashcard(payload)
    flashcard = Flashcard(**payload.model_dump(), criado_por=admin.id)
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return flashcard


@router.get("/flashcards/{flashcard_id}")
def obter_flashcard(flashcard_id: int, admin: AdminLogado, session: SessionDep):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    return flashcard


@router.put("/flashcards/{flashcard_id}")
def editar_flashcard(
    flashcard_id: int,
    payload: FlashcardPayload,
    admin: AdminLogado,
    session: SessionDep,
):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    _validar_vinculo_flashcard(payload)
    for campo, valor in payload.model_dump().items():
        setattr(flashcard, campo, valor)
    flashcard.atualizado_em = datetime.now()
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return flashcard


@router.patch("/flashcards/{flashcard_id}/status")
def alterar_status_flashcard(
    flashcard_id: int,
    ativo: bool,
    admin: AdminLogado,
    session: SessionDep,
):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    flashcard.ativo = ativo
    flashcard.atualizado_em = datetime.now()
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return flashcard
