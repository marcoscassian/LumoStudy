from __future__ import annotations

from datetime import date, timedelta

from sqlmodel import Session, select

from models.models import DiaEstudo, MetaUsuario, Usuarios

# Regras simples de gamificação. Como os valores ficam persistidos em usuarios,
# o cabeçalho e o perfil sempre mostram o mesmo saldo salvo no MySQL.
XP_QUESTAO_CORRETA = 10
XP_QUESTAO_ERRADA = 5
COINS_QUESTAO_CORRETA = 2
XP_FLASHCARD = 5
COINS_FLASHCARD = 1
XP_SIMULADO_CONCLUIDO = 30
COINS_SIMULADO_CONCLUIDO = 10

METAS_PADRAO = {
    "diario": {
        "tempo_estudo": 60,
        "flashcards": 15,
        "questoes": 25,
    },
    "semanal": {
        "tempo_estudo": 360,
        "flashcards": 90,
        "questoes": 150,
    },
    "mensal": {
        "tempo_estudo": 1500,
        "flashcards": 400,
        "questoes": 600,
    },
}


def garantir_metas_padrao(session: Session, usuario_id: int) -> None:
    existentes = session.exec(
        select(MetaUsuario).where(MetaUsuario.usuario_id == usuario_id)
    ).all()
    chaves = {(meta.periodo, meta.tipo) for meta in existentes}

    alterou = False
    for periodo, metas in METAS_PADRAO.items():
        for tipo, valor in metas.items():
            if (periodo, tipo) in chaves:
                continue
            session.add(
                MetaUsuario(
                    usuario_id=usuario_id,
                    periodo=periodo,
                    tipo=tipo,
                    valor_meta=valor,
                )
            )
            alterou = True

    if alterou:
        session.flush()


def obter_ou_criar_dia_estudo(session: Session, usuario_id: int, data_ref: date | None = None) -> DiaEstudo:
    data_ref = data_ref or date.today()
    dia = session.exec(
        select(DiaEstudo).where(
            DiaEstudo.usuario_id == usuario_id,
            DiaEstudo.data == data_ref,
        )
    ).first()
    if dia is None:
        dia = DiaEstudo(usuario_id=usuario_id, data=data_ref)
        session.add(dia)
        session.flush()
    return dia


def recalcular_streak(session: Session, usuario: Usuarios) -> int:
    datas = session.exec(
        select(DiaEstudo.data)
        .where(DiaEstudo.usuario_id == usuario.id)
        .order_by(DiaEstudo.data.desc())
    ).all()

    if not datas:
        usuario.streak = 0
        session.add(usuario)
        return 0

    hoje = date.today()
    ultima = datas[0]

    # A sequência continua válida se o usuário estudou hoje ou ontem. Assim,
    # abrir o app de manhã não zera uma sequência que ainda pode ser mantida.
    if ultima < hoje - timedelta(days=1):
        usuario.streak = 0
        session.add(usuario)
        return 0

    esperada = ultima
    streak = 0
    for data_estudo in datas:
        if data_estudo == esperada:
            streak += 1
            esperada -= timedelta(days=1)
        elif data_estudo < esperada:
            break

    usuario.streak = streak
    session.add(usuario)
    return streak


def recompensar_questao(usuario: Usuarios, correta: bool) -> tuple[int, int]:
    xp = XP_QUESTAO_CORRETA if correta else XP_QUESTAO_ERRADA
    coins = COINS_QUESTAO_CORRETA if correta else 0
    usuario.xp += xp
    usuario.coins += coins
    return xp, coins


def recompensar_flashcard(usuario: Usuarios) -> tuple[int, int]:
    usuario.xp += XP_FLASHCARD
    usuario.coins += COINS_FLASHCARD
    return XP_FLASHCARD, COINS_FLASHCARD


def recompensar_simulado(usuario: Usuarios) -> tuple[int, int]:
    usuario.xp += XP_SIMULADO_CONCLUIDO
    usuario.coins += COINS_SIMULADO_CONCLUIDO
    return XP_SIMULADO_CONCLUIDO, COINS_SIMULADO_CONCLUIDO
