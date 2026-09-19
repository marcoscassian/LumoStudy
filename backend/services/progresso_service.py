from __future__ import annotations

from datetime import date, timedelta

from sqlmodel import Session, select

from models.models import DiaEstudo, MetaUsuario, Notificacao, Usuarios

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


def garantir_notificacao_meta_diaria(session: Session, usuario: Usuarios, data_ref: date | None = None) -> Notificacao | None:
    """Cria, no máximo uma vez por dia, um aviso sobre a meta diária anterior não cumprida.

    O aviso é avaliado para ontem por padrão. Assim o usuário não recebe cobrança
    antes de o dia atual terminar e também não é inundado por vários dias antigos.
    """
    alvo = data_ref or (date.today() - timedelta(days=1))
    if alvo >= date.today():
        return None
    # Não cobre um dia anterior à existência da conta nem o próprio dia do cadastro.
    if usuario.criado_em and alvo <= usuario.criado_em.date():
        return None

    tipo_notificacao = f"meta_diaria_{alvo.isoformat()}"
    existente = session.exec(
        select(Notificacao).where(
            Notificacao.usuario_id == usuario.id,
            Notificacao.tipo == tipo_notificacao,
        )
    ).first()
    if existente:
        return existente

    garantir_metas_padrao(session, usuario.id)
    metas = session.exec(
        select(MetaUsuario).where(
            MetaUsuario.usuario_id == usuario.id,
            MetaUsuario.periodo == "diario",
        )
    ).all()
    metas_por_tipo = {meta.tipo: int(meta.valor_meta) for meta in metas}

    dia = session.exec(
        select(DiaEstudo).where(
            DiaEstudo.usuario_id == usuario.id,
            DiaEstudo.data == alvo,
        )
    ).first()

    atual = {
        "tempo_estudo": int((dia.tempo_segundos if dia else 0) // 60),
        "flashcards": int(dia.flashcards_revisados if dia else 0),
        "questoes": int(dia.questoes_respondidas if dia else 0),
    }

    faltas: list[str] = []
    rotulos = {
        "tempo_estudo": ("min de estudo", "min de estudo"),
        "flashcards": ("flashcard", "flashcards"),
        "questoes": ("questão", "questões"),
    }
    for tipo in ("tempo_estudo", "flashcards", "questoes"):
        meta = int(metas_por_tipo.get(tipo, 0))
        if meta <= 0:
            continue
        restante = max(0, meta - atual[tipo])
        if restante <= 0:
            continue
        singular, plural = rotulos[tipo]
        faltas.append(f"{restante} {singular if restante == 1 else plural}")

    if not faltas:
        return None

    if len(faltas) == 1:
        resumo = faltas[0]
    else:
        resumo = ", ".join(faltas[:-1]) + f" e {faltas[-1]}"

    notificacao = Notificacao(
        usuario_id=usuario.id,
        titulo="Meta diária não concluída",
        mensagem=f"Sua meta de ontem ficou incompleta. Faltaram {resumo}. Hoje é uma nova oportunidade de avançar na sua trilha.",
        tipo=tipo_notificacao,
        rota="/trilha",
        lida=False,
    )
    session.add(notificacao)
    session.flush()
    return notificacao


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
