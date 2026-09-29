from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlmodel import Session, select

from database.db import get_session
from models.models import DiaEstudo, Flashcard, RevisaoFlashcard, Usuarios
from routes.login_routes import UsuarioLogado
from services.progresso_service import recalcular_streak, recompensar_flashcard

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/flashcards", tags=["flashcards"])

MATERIAS_FLASHCARD = [
    "Linguagens",
    "Ciências Humanas",
    "Matemática",
    "Ciências da Natureza",
]


class FlashcardCreatePayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    frente: str = Field(min_length=1, max_length=5000)
    verso: str = Field(min_length=1, max_length=10000)
    disciplina: str = Field(min_length=1, max_length=100)
    conteudo_principal: str = Field(min_length=1, max_length=150)

    @field_validator("disciplina", "conteudo_principal")
    @classmethod
    def validar_texto(cls, valor: str):
        valor = valor.strip()
        if not valor:
            raise ValueError("Este campo não pode ficar vazio")
        return valor


class RevisaoPayload(BaseModel):
    resultado: str
    tempo_segundos: int | None = 0


@router.get("")
def listar_flashcards(
    usuario: UsuarioLogado,
    session: SessionDep,
    disciplina: str | None = None,
    conteudo: str | None = None,
):
    consulta = select(Flashcard).where(Flashcard.ativo == True)  # noqa: E712
    if disciplina:
        consulta = consulta.where(Flashcard.disciplina == disciplina)
    if conteudo:
        consulta = consulta.where(Flashcard.conteudo_principal == conteudo)
    cards = session.exec(consulta.order_by(Flashcard.atualizado_em.desc())).all()
    resposta = []
    for card in cards:
        autor = session.get(Usuarios, card.criado_por) if card.criado_por else None
        resposta.append({
            "id": card.id,
            "frente": card.frente,
            "verso": card.verso,
            "disciplina": card.disciplina,
            "conteudo_principal": card.conteudo_principal,
            "ativo": card.ativo,
            "criado_por": card.criado_por,
            "oficial": bool(autor and autor.is_admin),
            "criado_em": card.criado_em,
        })
    return resposta


def _registrar_dia(session: Session, usuario_id: int, tempo_segundos: int = 0) -> None:
    hoje = date.today()
    dia = session.exec(
        select(DiaEstudo).where(DiaEstudo.usuario_id == usuario_id, DiaEstudo.data == hoje)
    ).first()
    if not dia:
        dia = DiaEstudo(usuario_id=usuario_id, data=hoje)
    dia.flashcards_revisados += 1
    dia.tempo_segundos += max(0, min(int(tempo_segundos or 0), 3600))
    session.add(dia)


@router.post("", status_code=201)
def criar_flashcard(
    payload: FlashcardCreatePayload,
    usuario: UsuarioLogado,
    session: SessionDep,
):
    flashcard = Flashcard(
        frente=payload.frente,
        verso=payload.verso,
        disciplina=payload.disciplina,
        conteudo_principal=payload.conteudo_principal,
        criado_por=usuario.id,
    )
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return {
        "id": flashcard.id,
        "frente": flashcard.frente,
        "verso": flashcard.verso,
        "disciplina": flashcard.disciplina,
        "conteudo_principal": flashcard.conteudo_principal,
        "ativo": flashcard.ativo,
        "criado_por": flashcard.criado_por,
        "criado_em": flashcard.criado_em,
    }


@router.post("/{flashcard_id}/revisoes", status_code=201)
def registrar_revisao(
    flashcard_id: int,
    payload: RevisaoPayload,
    usuario: UsuarioLogado,
    session: SessionDep,
):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard or not flashcard.ativo:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")

    resultado = payload.resultado.strip().lower()
    intervalos = {
        "errei": 1,
        "parcial": 2,
        "dificil": 2,
        "bom": 5,
        "sem_ajuda": 10,
        "facil": 10,
    }
    if resultado not in intervalos:
        raise HTTPException(status_code=400, detail="Resultado de revisão inválido")

    intervalo = intervalos[resultado]
    agora = datetime.now()
    revisao = RevisaoFlashcard(
        usuario_id=usuario.id,
        flashcard_id=flashcard.id,
        resultado=resultado,
        revisado_em=agora,
        proxima_revisao=agora + timedelta(days=intervalo),
        intervalo_dias=intervalo,
    )
    session.add(revisao)
    _registrar_dia(session, usuario.id, payload.tempo_segundos or 0)
    xp, coins = recompensar_flashcard(usuario)
    recalcular_streak(session, usuario)
    session.add(usuario)
    session.commit()
    session.refresh(revisao)
    return {
        "revisao": revisao,
        "xp_ganhos": xp,
        "coins_ganhas": coins,
        "saldo": {"xp": usuario.xp, "coins": usuario.coins, "streak": usuario.streak},
    }
