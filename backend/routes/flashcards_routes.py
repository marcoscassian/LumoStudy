from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database.db import get_session
from models.models import DiaEstudo, Flashcard, ProgressoTema, Questao, RevisaoFlashcard
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/flashcards", tags=["flashcards"])


class RevisaoPayload(BaseModel):
    resultado: str


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
    return session.exec(consulta.order_by(Flashcard.atualizado_em.desc())).all()


def _registrar_dia(session: Session, usuario_id: int) -> None:
    hoje = date.today()
    dia = session.exec(
        select(DiaEstudo).where(DiaEstudo.usuario_id == usuario_id, DiaEstudo.data == hoje)
    ).first()
    if not dia:
        dia = DiaEstudo(usuario_id=usuario_id, data=hoje)
    dia.flashcards_revisados += 1
    session.add(dia)


def _atualizar_streak(session: Session, usuario) -> None:
    datas = session.exec(
        select(DiaEstudo.data)
        .where(DiaEstudo.usuario_id == usuario.id)
        .order_by(DiaEstudo.data.desc())
    ).all()
    esperada = date.today()
    streak = 0
    for data_estudo in datas:
        if data_estudo == esperada:
            streak += 1
            esperada -= timedelta(days=1)
        elif data_estudo < esperada:
            break
    usuario.streak = streak
    session.add(usuario)


def _atualizar_progresso(session: Session, usuario_id: int, flashcard: Flashcard) -> None:
    if not flashcard.questao_id:
        return
    questao = session.get(Questao, flashcard.questao_id)
    if not questao or not questao.tema_id:
        return
    progresso = session.exec(
        select(ProgressoTema).where(
            ProgressoTema.usuario_id == usuario_id,
            ProgressoTema.tema_id == questao.tema_id,
        )
    ).first()
    if not progresso:
        progresso = ProgressoTema(usuario_id=usuario_id, tema_id=questao.tema_id)
    progresso.flashcards_revisados += 1
    progresso.progresso = min(100, progresso.questoes_respondidas * 5 + progresso.flashcards_revisados * 5)
    progresso.status = "concluido" if progresso.progresso >= 100 else "em_andamento"
    progresso.atualizado_em = datetime.now()
    if progresso.status == "concluido" and progresso.concluido_em is None:
        progresso.concluido_em = datetime.now()
    session.add(progresso)


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
        "dificil": 2,
        "bom": 5,
        "facil": 10,
    }
    if resultado not in intervalos:
        raise HTTPException(status_code=400, detail="Resultado inválido. Use errei, dificil, bom ou facil")

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
    _registrar_dia(session, usuario.id)
    _atualizar_progresso(session, usuario.id, flashcard)
    _atualizar_streak(session, usuario)
    session.commit()
    session.refresh(revisao)
    return revisao
