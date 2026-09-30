from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, update
from sqlmodel import Session, select

from models.models import (
    RespostaUsuario,
    TentativaBloco,
    TentativaSimulado,
    Usuarios,
)

XP_POR_QUESTAO = 10

NIVEIS = (
    {"numero": 1, "nome": "Trouxa", "xp": 0, "questoes": 0},
    {"numero": 2, "nome": "Calouro de Magia", "xp": 250, "questoes": 25},
    {"numero": 3, "nome": "Aprendiz de Bruxo", "xp": 750, "questoes": 75},
    {"numero": 4, "nome": "Bruxo", "xp": 1_500, "questoes": 150},
    {"numero": 5, "nome": "Bruxo Experiente", "xp": 3_000, "questoes": 300},
    {"numero": 6, "nome": "Monitor", "xp": 5_000, "questoes": 500},
    {"numero": 7, "nome": "Auror", "xp": 7_500, "questoes": 750},
    {"numero": 8, "nome": "Mestre da Magia", "xp": 10_000, "questoes": 1_000},
    {"numero": 9, "nome": "Arquimago", "xp": 15_000, "questoes": 1_500},
    {"numero": 10, "nome": "Lenda do Mundo Bruxo", "xp": 20_000, "questoes": 2_000},
)


def calcular_xp_atividade(questoes_respondidas: int) -> int:
    return max(0, int(questoes_respondidas)) * XP_POR_QUESTAO


def calcular_progressao(xp_total: int, questoes_contabilizadas: int | None = None) -> dict:
    xp_total = max(0, int(xp_total or 0))
    atual = NIVEIS[0]
    for nivel in NIVEIS:
        if xp_total < nivel["xp"]:
            break
        atual = nivel

    indice = atual["numero"] - 1
    proximo = NIVEIS[indice + 1] if indice + 1 < len(NIVEIS) else None
    if proximo:
        tamanho_faixa = proximo["xp"] - atual["xp"]
        avancado_na_faixa = min(tamanho_faixa, max(0, xp_total - atual["xp"]))
        percentual = round((avancado_na_faixa / tamanho_faixa) * 100, 2)
        xp_restante = max(0, proximo["xp"] - xp_total)
    else:
        tamanho_faixa = 0
        avancado_na_faixa = 0
        percentual = 100.0
        xp_restante = 0

    questoes_restantes = (
        (xp_restante + XP_POR_QUESTAO - 1) // XP_POR_QUESTAO
        if proximo
        else 0
    )

    return {
        "nivel_atual": atual["numero"],
        "nome_nivel_atual": atual["nome"],
        "xp_total": xp_total,
        "questoes_contabilizadas": (
            max(0, int(questoes_contabilizadas))
            if questoes_contabilizadas is not None
            else xp_total // XP_POR_QUESTAO
        ),
        "xp_inicio_nivel": atual["xp"],
        "xp_proximo_nivel": proximo["xp"] if proximo else None,
        "xp_restante": xp_restante,
        "progresso_percentual": percentual,
        "xp_na_faixa": avancado_na_faixa,
        "xp_total_faixa": tamanho_faixa,
        "numero_proximo_nivel": proximo["numero"] if proximo else None,
        "nome_proximo_nivel": proximo["nome"] if proximo else None,
        "questoes_restantes": questoes_restantes,
        "nivel_maximo": proximo is None,
    }


def contar_questoes_com_xp(session: Session, usuario_id: int) -> int:
    xp_blocos = session.exec(
        select(func.coalesce(func.sum(TentativaBloco.xp_concedido), 0)).where(
            TentativaBloco.usuario_id == usuario_id,
            TentativaBloco.xp_processado == True,  # noqa: E712
        )
    ).one()
    xp_simulados = session.exec(
        select(func.coalesce(func.sum(TentativaSimulado.xp_concedido), 0)).where(
            TentativaSimulado.usuario_id == usuario_id,
            TentativaSimulado.xp_processado == True,  # noqa: E712
        )
    ).one()
    return (int(xp_blocos or 0) + int(xp_simulados or 0)) // XP_POR_QUESTAO


def progressao_usuario(session: Session, usuario: Usuarios) -> dict:
    return calcular_progressao(
        usuario.xp,
        contar_questoes_com_xp(session, usuario.id),
    )


def trilha_niveis(xp_total: int) -> list[dict]:
    progressao = calcular_progressao(xp_total)
    atual = progressao["nivel_atual"]
    return [
        {
            **nivel,
            "status": (
                "concluido"
                if nivel["numero"] < atual
                else "atual"
                if nivel["numero"] == atual
                else "bloqueado"
            ),
        }
        for nivel in NIVEIS
    ]


def processar_xp_atividade(
    session: Session,
    usuario_id: int,
    tentativa: TentativaBloco | TentativaSimulado,
) -> dict:
    if not tentativa.finalizada:
        raise ValueError("O XP só pode ser processado após a atividade ser finalizada")

    if tentativa.xp_processado:
        return {
            "xp_ganhos": 0,
            "xp_total_atividade": tentativa.xp_concedido,
            "questoes_contabilizadas": tentativa.xp_concedido // XP_POR_QUESTAO,
            "ja_processado": True,
        }

    if isinstance(tentativa, TentativaSimulado):
        condicao = RespostaUsuario.tentativa_simulado_id == tentativa.id
    else:
        condicao = RespostaUsuario.tentativa_bloco_id == tentativa.id

    respostas_registradas = int(
        session.exec(select(func.count(RespostaUsuario.id)).where(condicao)).one()
        or 0
    )
    quantidade = min(respostas_registradas, tentativa.total_questoes)
    xp = calcular_xp_atividade(quantidade)

    if xp:
        session.exec(
            update(Usuarios)
            .where(Usuarios.id == usuario_id)
            .values(xp=Usuarios.xp + xp)
        )

    tentativa.xp_processado = True
    tentativa.xp_concedido = xp
    tentativa.xp_processado_em = datetime.now()
    session.add(tentativa)

    return {
        "xp_ganhos": xp,
        "xp_total_atividade": xp,
        "questoes_contabilizadas": quantidade,
        "ja_processado": False,
    }
