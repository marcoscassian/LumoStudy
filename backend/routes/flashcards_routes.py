from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database.database import get_session
from models.models import Flashcard
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/flashcards", tags=["flashcards"])


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
