from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database.db import get_session
from models.models import Prova, Questao, RespostaUsuario, Simulado, SimuladoQuestao, TentativaSimulado
from routes.login_routes import UsuarioLogado
from services.progresso_service import recompensar_simulado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/simulados", tags=["simulados"])


@router.get("")
def listar_simulados(usuario: UsuarioLogado, session: SessionDep):
    simulados = session.exec(select(Simulado).where(Simulado.ativo == True).order_by(Simulado.id)).all()  # noqa: E712
    saida = []
    for simulado in simulados:
        total = len(session.exec(select(SimuladoQuestao).where(SimuladoQuestao.simulado_id == simulado.id)).all())
        saida.append({
            "id": simulado.id,
            "nome": simulado.nome,
            "descricao": simulado.descricao,
            "tempo_limite_minutos": simulado.tempo_limite_minutos,
            "total_questoes": total,
        })
    return saida


@router.post("/{simulado_id}/iniciar", status_code=201)
def iniciar_simulado(simulado_id: int, usuario: UsuarioLogado, session: SessionDep):
    simulado = session.get(Simulado, simulado_id)
    if not simulado or not simulado.ativo:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")

    vinculos = session.exec(
        select(SimuladoQuestao)
        .where(SimuladoQuestao.simulado_id == simulado.id)
        .order_by(SimuladoQuestao.ordem)
    ).all()
    if not vinculos:
        raise HTTPException(status_code=409, detail="Simulado ainda não possui questões")

    tentativa = TentativaSimulado(
        usuario_id=usuario.id,
        simulado_id=simulado.id,
        total_questoes=len(vinculos),
    )
    session.add(tentativa)
    session.commit()
    session.refresh(tentativa)

    from routes.questoes_routes import _montar_questao_publica

    questoes = []
    for vinculo in vinculos:
        questao = session.get(Questao, vinculo.questao_id)
        if not questao:
            continue
        prova = session.get(Prova, questao.prova_id)
        if not prova:
            continue
        questoes.append(_montar_questao_publica(prova.codigo, questao.numero, questao.nivel, session))

    return {
        "tentativa_id": tentativa.id,
        "simulado": {
            "id": simulado.id,
            "nome": simulado.nome,
            "tempo_limite_minutos": simulado.tempo_limite_minutos,
        },
        "questoes": questoes,
    }


@router.post("/tentativas/{tentativa_id}/finalizar")
def finalizar_simulado(tentativa_id: int, usuario: UsuarioLogado, session: SessionDep):
    tentativa = session.get(TentativaSimulado, tentativa_id)
    if not tentativa or tentativa.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada")
    if tentativa.finalizada:
        return tentativa

    respostas = session.exec(
        select(RespostaUsuario).where(
            RespostaUsuario.usuario_id == usuario.id,
            RespostaUsuario.tentativa_simulado_id == tentativa.id,
        )
    ).all()
    tentativa.acertos = sum(1 for resposta in respostas if resposta.correta)
    tentativa.finalizado_em = datetime.now()
    tentativa.tempo_gasto_segundos = max(0, int((tentativa.finalizado_em - tentativa.iniciado_em).total_seconds()))
    tentativa.finalizada = True
    xp, coins = recompensar_simulado(usuario)
    session.add(tentativa)
    session.add(usuario)
    session.commit()
    session.refresh(tentativa)
    return {
        "tentativa": tentativa,
        "xp_ganhos": xp,
        "coins_ganhas": coins,
        "saldo": {"xp": usuario.xp, "coins": usuario.coins, "streak": usuario.streak},
    }
