from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, select

from database.db import get_session
from models.models import RespostaUsuario, RevisaoFlashcard, TentativaSimulado
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/conquistas", tags=["conquistas"])


def _count(session: Session, model, *conditions) -> int:
    value = session.exec(select(func.count(model.id)).where(*conditions)).one()
    return int(value or 0)


@router.get("")
def listar_conquistas(usuario: UsuarioLogado, session: SessionDep):
    questoes = _count(session, RespostaUsuario, RespostaUsuario.usuario_id == usuario.id)
    corretas = _count(
        session,
        RespostaUsuario,
        RespostaUsuario.usuario_id == usuario.id,
        RespostaUsuario.correta == True,  # noqa: E712
    )
    flashcards = _count(session, RevisaoFlashcard, RevisaoFlashcard.usuario_id == usuario.id)
    simulados = _count(
        session,
        TentativaSimulado,
        TentativaSimulado.usuario_id == usuario.id,
        TentativaSimulado.finalizada == True,  # noqa: E712
    )

    conquistas = [
        ("primeira-luz", "Primeira Luz", "Responda sua primeira questão", questoes >= 1, min(questoes, 1), 1, "questoes"),
        ("dez-feiticos", "Dez Feitiços", "Responda 10 questões", questoes >= 10, min(questoes, 10), 10, "questoes"),
        ("centenario", "Centenário", "Responda 100 questões", questoes >= 100, min(questoes, 100), 100, "questoes"),
        ("mira-certa", "Mira Certa", "Acerte 50 questões", corretas >= 50, min(corretas, 50), 50, "acertos"),
        ("memoria-magica", "Memória Mágica", "Revise 25 flashcards", flashcards >= 25, min(flashcards, 25), 25, "flashcards"),
        ("primeiro-simulado", "Desafio Aceito", "Conclua um simulado", simulados >= 1, min(simulados, 1), 1, "simulados"),
        ("sequencia-3", "Chama Acesa", "Mantenha uma sequência de 3 dias", usuario.streak >= 3, min(usuario.streak, 3), 3, "dias"),
        ("sequencia-7", "Semana de Fogo", "Mantenha uma sequência de 7 dias", usuario.streak >= 7, min(usuario.streak, 7), 7, "dias"),
        ("carteira-cheia", "Gringotes", "Tenha 100 moedas", usuario.coins >= 100, min(usuario.coins, 100), 100, "moedas"),
        ("nivel-2", "Bruxo Experiente", "Alcance o nível 2", usuario.xp >= 1000, min(usuario.xp, 1000), 1000, "xp"),
    ]

    saida = [
        {
            "slug": slug,
            "nome": nome,
            "descricao": descricao,
            "desbloqueada": desbloqueada,
            "atual": atual,
            "meta": meta,
            "unidade": unidade,
            "percentual": min(100, round((atual / meta) * 100)) if meta else 0,
        }
        for slug, nome, descricao, desbloqueada, atual, meta, unidade in conquistas
    ]

    return {
        "desbloqueadas": sum(1 for item in saida if item["desbloqueada"]),
        "total": len(saida),
        "conquistas": saida,
    }
