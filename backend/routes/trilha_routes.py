from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database.db import get_session
from models.models import Area, DiaEstudo, ProgressoTema, Tema
from routes.login_routes import UsuarioLogado
from services.progresso_service import recalcular_streak

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/trilha", tags=["trilha"])


@router.get("/progresso")
def obter_progresso(usuario: UsuarioLogado, session: SessionDep):
    """Retorna todos os dados reais exibidos na Trilha de Estudos.

    O progresso vem de progresso_tema e a sequência/dias da semana vêm de
    dias_estudo. Nenhum valor deste endpoint é mockado no frontend.
    """
    areas = session.exec(select(Area).order_by(Area.ordem)).all()
    resposta = []

    for area in areas:
        temas = session.exec(
            select(Tema).where(Tema.area_id == area.id, Tema.ativo == True).order_by(Tema.ordem)  # noqa: E712
        ).all()
        itens = []
        for tema in temas:
            progresso = session.exec(
                select(ProgressoTema).where(
                    ProgressoTema.usuario_id == usuario.id,
                    ProgressoTema.tema_id == tema.id,
                )
            ).first()
            itens.append(
                {
                    "id": tema.id,
                    "nome": tema.nome,
                    "slug": tema.slug,
                    "progresso": progresso.progresso if progresso else 0,
                    "status": progresso.status if progresso else "nao_iniciado",
                    "questoes_respondidas": progresso.questoes_respondidas if progresso else 0,
                    "questoes_corretas": progresso.questoes_corretas if progresso else 0,
                    "flashcards_revisados": progresso.flashcards_revisados if progresso else 0,
                }
            )

        progresso_area = round(sum(item["progresso"] for item in itens) / len(itens)) if itens else 0
        resposta.append(
            {
                "id": area.id,
                "nome": area.nome,
                "slug": area.slug,
                "progresso": progresso_area,
                "temas": itens,
            }
        )

    todos_temas = [tema for area in resposta for tema in area["temas"]]
    geral = round(sum(t["progresso"] for t in todos_temas) / len(todos_temas)) if todos_temas else 0
    concluidos = sum(1 for t in todos_temas if t["status"] == "concluido")

    # Recalcula a sequência usando o histórico real antes de devolver a tela.
    recalcular_streak(session, usuario)

    hoje = date.today()
    inicio_semana = hoje - timedelta(days=hoje.weekday())  # segunda-feira
    fim_semana = inicio_semana + timedelta(days=6)
    datas_estudadas = set(
        session.exec(
            select(DiaEstudo.data).where(
                DiaEstudo.usuario_id == usuario.id,
                DiaEstudo.data >= inicio_semana,
                DiaEstudo.data <= fim_semana,
            )
        ).all()
    )

    semana = []
    for indice in range(7):
        dia = inicio_semana + timedelta(days=indice)
        semana.append(
            {
                "data": dia.isoformat(),
                "estudou": dia in datas_estudadas,
                "hoje": dia == hoje,
            }
        )

    session.commit()
    session.refresh(usuario)

    return {
        "progresso_geral": geral,
        "temas_concluidos": concluidos,
        "total_temas": len(todos_temas),
        "areas": resposta,
        "sequencia": {
            "dias": int(usuario.streak or 0),
            "semana": semana,
        },
    }
