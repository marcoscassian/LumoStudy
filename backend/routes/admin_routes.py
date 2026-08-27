from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import Session, select

from database.db import get_session
from models.models import Flashcard, Prova, Questao, QuestaoEditorial
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


def _validar_questao_arquivo(prova: str, numero: str) -> dict:
    numero = str(numero).strip()
    if numero not in _pastas_de_questoes(prova):
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return _ler_json_questao(prova, numero)


def _buscar_questao_db(session: Session, prova: str, numero: str) -> Questao:
    questao = session.exec(
        select(Questao)
        .join(Prova, Prova.id == Questao.prova_id)
        .where(Prova.codigo == prova, Questao.numero == str(numero).strip())
    ).first()
    if not questao:
        raise HTTPException(
            status_code=409,
            detail="Questão ainda não foi indexada no MySQL. Execute python database/createdb.py.",
        )
    return questao


def _referencia_questao(session: Session, questao_id: int | None) -> tuple[str | None, str | None]:
    if not questao_id:
        return None, None
    questao = session.get(Questao, questao_id)
    if not questao:
        return None, None
    prova = session.get(Prova, questao.prova_id)
    return (prova.codigo if prova else None), questao.numero


def _flashcard_publico(session: Session, flashcard: Flashcard) -> dict:
    prova, numero = _referencia_questao(session, flashcard.questao_id)
    return {
        "id": flashcard.id,
        "frente": flashcard.frente,
        "verso": flashcard.verso,
        "disciplina": flashcard.disciplina,
        "conteudo_principal": flashcard.conteudo_principal,
        "prova": prova,
        "numero_questao": numero,
        "questao_id": flashcard.questao_id,
        "ativo": flashcard.ativo,
        "criado_por": flashcard.criado_por,
        "criado_em": flashcard.criado_em,
        "atualizado_em": flashcard.atualizado_em,
    }


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
def listar_provas_admin(admin: AdminLogado, session: SessionDep):
    provas = session.exec(select(Prova).where(Prova.ativa == True).order_by(Prova.ano.desc())).all()  # noqa: E712
    if provas:
        return [{"prova": prova.codigo, "ano": prova.ano} for prova in provas]
    # fallback enquanto o catálogo ainda não tiver sido sincronizado
    return [
        {"prova": prova, "ano": int(prova.removeprefix("ENEM"))}
        for prova in sorted(_listar_provas(), reverse=True)
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
    dados = _validar_questao_arquivo(prova, numero)
    questao = _buscar_questao_db(session, prova, numero)
    editorial = session.exec(
        select(QuestaoEditorial).where(QuestaoEditorial.questao_id == questao.id)
    ).first()
    return {"original": _montar_questao_original(prova, numero, dados), "editorial": editorial}


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
    _validar_questao_arquivo(prova, numero)
    questao = _buscar_questao_db(session, prova, numero)

    editorial = session.exec(
        select(QuestaoEditorial).where(QuestaoEditorial.questao_id == questao.id)
    ).first()
    agora = datetime.now()
    if editorial is None:
        editorial = QuestaoEditorial(questao_id=questao.id, criado_em=agora)

    editorial.resolucao = payload.resolucao
    editorial.disciplina = payload.disciplina
    editorial.conteudo_principal = payload.conteudo_principal
    editorial.atualizado_por = admin.id
    editorial.atualizado_em = agora
    session.add(editorial)
    session.commit()
    session.refresh(editorial)
    return editorial


def _questao_id_do_payload(session: Session, payload: FlashcardPayload) -> int | None:
    if bool(payload.prova) != bool(payload.numero_questao):
        raise HTTPException(status_code=400, detail="Informe prova e número da questão juntos")
    if not payload.prova:
        return None
    prova = payload.prova.upper()
    if prova not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova vinculada não encontrada")
    _validar_questao_arquivo(prova, payload.numero_questao or "")
    return _buscar_questao_db(session, prova, payload.numero_questao or "").id


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
    cards = session.exec(consulta.order_by(Flashcard.atualizado_em.desc())).all()
    return [_flashcard_publico(session, card) for card in cards]


@router.post("/flashcards", status_code=201)
def criar_flashcard(payload: FlashcardPayload, admin: AdminLogado, session: SessionDep):
    questao_id = _questao_id_do_payload(session, payload)
    dados = payload.model_dump(exclude={"prova", "numero_questao"})
    flashcard = Flashcard(**dados, questao_id=questao_id, criado_por=admin.id)
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return _flashcard_publico(session, flashcard)


@router.get("/flashcards/{flashcard_id}")
def obter_flashcard(flashcard_id: int, admin: AdminLogado, session: SessionDep):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    return _flashcard_publico(session, flashcard)


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
    questao_id = _questao_id_do_payload(session, payload)
    for campo, valor in payload.model_dump(exclude={"prova", "numero_questao"}).items():
        setattr(flashcard, campo, valor)
    flashcard.questao_id = questao_id
    flashcard.atualizado_em = datetime.now()
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return _flashcard_publico(session, flashcard)


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
    return _flashcard_publico(session, flashcard)
