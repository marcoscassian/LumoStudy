from datetime import datetime
import random
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database.db import get_session
from models.models import Prova, Questao, RespostaUsuario, Simulado, SimuladoQuestao, TentativaSimulado
from routes.login_routes import UsuarioLogado
from services.progresso_service import obter_ou_criar_dia_estudo, recalcular_streak, recompensar_simulado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/simulados", tags=["simulados"])


class IniciarSimuladoRequest(BaseModel):
    dia_prova: int
    quantidade: int


def _resumo_simulado(simulado: Simulado, total: int) -> dict:
    return {
        "id": simulado.id,
        "nome": simulado.nome,
        "descricao": simulado.descricao,
        "tempo_limite_minutos": simulado.tempo_limite_minutos,
        "total_questoes": total,
        "dia_prova": simulado.dia_prova,
        "quantidade_questoes": simulado.quantidade_questoes,
    }


@router.get("")
def listar_simulados(usuario: UsuarioLogado, session: SessionDep):
    simulados = session.exec(
        select(Simulado)
        .where(Simulado.ativo == True, Simulado.dia_prova != None)  # noqa: E711,E712
        .order_by(Simulado.dia_prova, Simulado.quantidade_questoes)
    ).all()
    return [
        _resumo_simulado(
            simulado,
            len(session.exec(select(SimuladoQuestao).where(SimuladoQuestao.simulado_id == simulado.id)).all()),
        )
        for simulado in simulados
    ]


@router.post("/iniciar", status_code=201)
def iniciar_simulado_configuravel(payload: IniciarSimuladoRequest, usuario: UsuarioLogado, session: SessionDep):
    if payload.dia_prova not in (1, 2):
        raise HTTPException(status_code=400, detail="Escolha o Dia 1 ou o Dia 2 do ENEM")
    if payload.quantidade not in (25, 90):
        raise HTTPException(status_code=400, detail="Escolha 25 ou 90 questões")

    simulado = session.exec(
        select(Simulado).where(
            Simulado.ativo == True,  # noqa: E712
            Simulado.dia_prova == payload.dia_prova,
            Simulado.quantidade_questoes == payload.quantidade,
        )
    ).first()
    if not simulado:
        raise HTTPException(status_code=409, detail="Configuração de simulado ainda não foi sincronizada")

    vinculos = session.exec(
        select(SimuladoQuestao)
        .where(SimuladoQuestao.simulado_id == simulado.id)
        .order_by(SimuladoQuestao.ordem)
    ).all()
    if len(vinculos) < payload.quantidade:
        raise HTTPException(status_code=409, detail="Simulado ainda não possui questões suficientes")

    random.shuffle(vinculos)
    vinculos = vinculos[: payload.quantidade]

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
        "simulado": _resumo_simulado(simulado, len(questoes)),
        "questoes": questoes,
    }


# Mantido para compatibilidade com chamadas antigas do projeto.
@router.post("/{simulado_id}/iniciar", status_code=201)
def iniciar_simulado_por_id(simulado_id: int, usuario: UsuarioLogado, session: SessionDep):
    simulado = session.get(Simulado, simulado_id)
    if not simulado or not simulado.ativo:
        raise HTTPException(status_code=404, detail="Simulado não encontrado")
    return iniciar_simulado_configuravel(
        IniciarSimuladoRequest(
            dia_prova=simulado.dia_prova or 1,
            quantidade=simulado.quantidade_questoes or 25,
        ),
        usuario,
        session,
    )


@router.post("/tentativas/{tentativa_id}/finalizar")
def finalizar_simulado(tentativa_id: int, usuario: UsuarioLogado, session: SessionDep):
    tentativa = session.get(TentativaSimulado, tentativa_id)
    if not tentativa or tentativa.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Tentativa não encontrada")
    if tentativa.finalizada:
        return {
            "tentativa": tentativa,
            "xp_ganhos": 0,
            "coins_ganhas": 0,
            "saldo": {"xp": usuario.xp, "coins": usuario.coins, "streak": usuario.streak},
        }

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

    # O simulado conta como tempo real de estudo. As respostas do simulado são
    # gravadas com tempo 0 no front para não duplicar este total.
    dia = obter_ou_criar_dia_estudo(session, usuario.id)
    dia.tempo_segundos += tentativa.tempo_gasto_segundos
    session.add(dia)

    xp, coins = recompensar_simulado(usuario)
    recalcular_streak(session, usuario)
    session.add(tentativa)
    session.add(usuario)
    session.commit()
    session.refresh(tentativa)
    session.refresh(usuario)

    return {
        "tentativa": tentativa,
        "xp_ganhos": xp,
        "coins_ganhas": coins,
        "saldo": {"xp": usuario.xp, "coins": usuario.coins, "streak": usuario.streak},
    }
