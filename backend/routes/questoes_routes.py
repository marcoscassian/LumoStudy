import json
import random
import re
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlmodel import Session, select

from database.db import get_session
from models.models import (
    DiaEstudo,
    ProgressoTema,
    Prova,
    Questao,
    QuestaoEditorial,
    Resolucao,
    RespostaUsuario,
    SimuladoQuestao,
    TentativaBloco,
    TentativaBlocoQuestao,
    TentativaSimulado,
)
from routes.login_routes import UsuarioLogado
from services.progresso_service import recalcular_streak, recompensar_questao
from services.xp_service import processar_xp_atividade, progressao_usuario

router = APIRouter(prefix="/questoes", tags=["questoes"])

BASE_DIR = Path(__file__).resolve().parent.parent / "database" / "provas"

AREAS = [
    {"label": "Linguagens, Códigos e suas Tecnologias", "value": "linguagens"},
    {"label": "Ciências Humanas e suas Tecnologias", "value": "ciencias-humanas"},
    {"label": "Matemática e suas Tecnologias", "value": "matematica"},
    {"label": "Ciências da Natureza e suas Tecnologias", "value": "ciencias-natureza"},
]

VALORES_DE_AREA = {area["value"] for area in AREAS}
QUANTIDADES_VALIDAS = {5, 10, 15, 20}

NOMES_DISCIPLINAS = {
    "linguagens": "Linguagens",
    "ciencias-humanas": "Ciências Humanas",
    "ciencias-humana": "Ciências Humanas",
    "matematica": "Matemática",
    "ciencias-natureza": "Ciências da Natureza",
}


def _nome_disciplina(valor: str | None) -> str | None:
    if not valor:
        return None
    chave = valor.strip().lower()
    return NOMES_DISCIPLINAS.get(chave, valor)


def _listar_provas() -> list[str]:
    if not BASE_DIR.exists():
        return []
    return [pasta.name for pasta in BASE_DIR.iterdir() if pasta.is_dir()]


def _chave_ordenacao_pasta(nome: str):
    """Ordena pastas de questão numericamente (1, 2, ..., 10) e mantém as
    variantes de idioma (ex.: '91-ingles', '91-espanhol') logo depois da
    questão de mesmo número."""
    m = re.match(r"(\d+)(.*)", nome)
    if not m:
        return (10**9, nome)
    return (int(m.group(1)), m.group(2))


def _pastas_de_questoes(prova: str) -> list[str]:
    caminho = BASE_DIR / prova / "questions"
    if not caminho.exists():
        return []
    return sorted((p.name for p in caminho.iterdir() if p.is_dir()), key=_chave_ordenacao_pasta)


def _questoes_da_area(area: str) -> list[dict]:
    """Retorna questões da área pedida, juntando todas as provas.
    Aqui 'index' é o nome real da pasta da questão (ex.: '12' ou '91-ingles'),
    não necessariamente um número puro, já que provas com opção de língua
    estrangeira guardam duas pastas para o mesmo número de questão."""
    itens = []
    for prova in _listar_provas():
        pastas_da_area = [
            pasta for pasta in _pastas_de_questoes(prova)
            if _ler_json_questao(prova, pasta).get("discipline") == area
        ]
        itens.extend({"prova": prova, "index": pasta} for pasta in pastas_da_area)

    return itens


@lru_cache(maxsize=None)
def _ler_json_questao(prova: str, index: str) -> dict:
    caminho = BASE_DIR / prova / "questions" / str(index) / "details.json"
    if not caminho.exists():
        raise HTTPException(status_code=404, detail=f"Questão {index} da prova {prova} não encontrada")
    with open(caminho, encoding="utf-8") as arquivo:
        return json.load(arquivo)


def _nome_arquivo_local(referencia: str) -> str:
    """As questões guardam 'files' como URLs completas (ex.: https://enem.dev/...),
    mas as imagens já estão salvas localmente com o mesmo nome de arquivo. Aqui
    extraímos só o nome do arquivo para montar o link estático local."""
    return Path(urlparse(referencia).path).name or referencia


def _limpar_marcadores_de_imagem(texto: str | None) -> str | None:
    """Remove do texto os links de imagem que já são enviados separadamente.

    O acervo do ENEM guarda imagens no campo ``context`` em Markdown
    (``![](https://enem.dev/...)``) e, ao mesmo tempo, lista os mesmos arquivos em
    ``files``. Como o front renderiza ``files`` como <img>, deixar o Markdown no
    enunciado faz a URL aparecer como texto e dá a impressão de imagem duplicada.
    Também tratamos a forma ``[image](...)`` e uma variante escapada para que
    registros importados anteriormente não vazem links para a interface.
    """
    if texto is None:
        return None

    limpo = str(texto)
    # Markdown de imagem normal: ![alt](url)
    limpo = re.sub(r"!\[[^\]]*\]\(\s*[^)\n]+\s*\)", "", limpo, flags=re.IGNORECASE)
    # Variante escapada/duplicada observada em alguns conteúdos copiados.
    limpo = re.sub(
        r"!\[[^\]]*\]\\?\(\s*\[[^\]]+\]\([^)]*\)\s*\)",
        "",
        limpo,
        flags=re.IGNORECASE,
    )
    # Links auxiliares de imagem que não fazem parte do enunciado.
    limpo = re.sub(
        r"\[(?:image|imagem)\]\(\s*(?:https?://|/)[^)\n]+\)",
        "",
        limpo,
        flags=re.IGNORECASE,
    )
    # Caso algum importador tenha gravado <img ...> diretamente.
    limpo = re.sub(r"<img\b[^>]*>", "", limpo, flags=re.IGNORECASE)
    # Evita grandes buracos depois da remoção sem destruir as quebras de parágrafo.
    limpo = re.sub(r"[ \t]+\n", "\n", limpo)
    limpo = re.sub(r"\n{3,}", "\n\n", limpo)
    return limpo.strip()


def _montar_questao_original(prova: str, index: str, dados: dict | None = None) -> dict:
    """Monta a questão para envio ao front-end, sem revelar o gabarito."""
    dados = dados or _ler_json_questao(prova, index)

    imagens = [
        f"/static/provas/{prova}/questions/{index}/{_nome_arquivo_local(referencia)}"
        for referencia in dados.get("files", [])
    ]

    alternativas = [
        {
            "letra": alternativa["letter"],
            "texto": _limpar_marcadores_de_imagem(alternativa.get("text")) or "",
            "imagem": (
                f"/static/provas/{prova}/questions/{index}/{_nome_arquivo_local(alternativa['file'])}"
                if alternativa.get("file")
                else None
            ),
        }
        for alternativa in dados.get("alternatives", [])
    ]

    return {
        "prova": prova,
        "index": index,
        "titulo": dados.get("title"),
        "enunciado": _limpar_marcadores_de_imagem(dados.get("context")),
        "comando": _limpar_marcadores_de_imagem(dados.get("alternativesIntroduction")),
        "imagens": imagens,
        "alternativas": alternativas,
        "gabarito": dados.get("correctAlternative"),
        "disciplinaOriginal": dados.get("discipline"),
    }


def _buscar_questao_db(session: Session, prova: str, index: str) -> Questao | None:
    return session.exec(
        select(Questao)
        .join(Prova, Prova.id == Questao.prova_id)
        .where(Prova.codigo == prova, Questao.numero == str(index))
    ).first()


def _buscar_editorial(session: Session, prova: str, index: str) -> QuestaoEditorial | None:
    questao = _buscar_questao_db(session, prova, index)
    if not questao:
        return None
    return session.exec(
        select(QuestaoEditorial).where(QuestaoEditorial.questao_id == questao.id)
    ).first()


def _montar_questao_publica(prova: str, index: str, session: Session) -> dict:
    dados = _ler_json_questao(prova, index)
    questao = _montar_questao_original(prova, index, dados)
    questao.pop("gabarito", None)
    questao.update({
        "disciplina": _nome_disciplina(dados.get("discipline")),
    })
    return questao


@router.get("/areas")
def listar_areas():
    """Lista as 4 grandes áreas do ENEM disponíveis para praticar."""
    return AREAS


@router.get("/provas")
def listar_provas_publicas():
    """Lista os anos que possuem questões no acervo local."""
    provas = []
    for codigo in _listar_provas():
        if not re.fullmatch(r"ENEM\d{4}", codigo):
            continue
        quantidade = len(_pastas_de_questoes(codigo))
        if quantidade:
            provas.append({"ano": int(codigo.removeprefix("ENEM")), "codigo": codigo, "quantidade_questoes": quantidade})
    return sorted(provas, key=lambda prova: prova["ano"], reverse=True)


@router.get("/provas/{ano}")
def detalhar_prova_publica(ano: int):
    """Retorna o índice completo de questões de uma prova, em ordem numérica."""
    codigo = f"ENEM{ano}"
    if codigo not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova não encontrada")

    questoes = []
    for index in _pastas_de_questoes(codigo):
        dados = _ler_json_questao(codigo, index)
        questoes.append({
            "index": index,
            "disciplina": _nome_disciplina(dados.get("discipline")),
            "idioma": dados.get("language"),
        })
    return {"ano": ano, "codigo": codigo, "questoes": questoes}


@router.get("/provas/{ano}/questoes/{index}")
def visualizar_questao_da_prova(ano: int, index: str):
    """Permite visualizar uma questão específica e seu gabarito no acervo."""
    codigo = f"ENEM{ano}"
    if codigo not in _listar_provas() or index not in _pastas_de_questoes(codigo):
        raise HTTPException(status_code=404, detail="Questão não encontrada nesta prova")
    return _montar_questao_original(codigo, index)


@router.get("/gerar")
def gerar_questoes(
    area: str = Query(..., description="linguagens, ciencias-humanas, matematica ou ciencias-natureza"),
    quantidade: int = Query(10),
    session: Session = Depends(get_session),
):
    if area not in VALORES_DE_AREA:
        raise HTTPException(status_code=400, detail="Área inválida")

    if quantidade not in QUANTIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Quantidade inválida. Use 5, 10, 15 ou 20")

    itens_area = _questoes_da_area(area)

    if not itens_area:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada para essa área")

    escolhidos = random.sample(itens_area, k=min(quantidade, len(itens_area)))
    questoes = [
        _montar_questao_publica(item["prova"], item["index"], session)
        for item in escolhidos
    ]

    return {
        "area": area,
        "quantidade": len(questoes),
        "questoes": questoes,
    }


class IniciarBlocoRequest(BaseModel):
    area: str
    quantidade: int = 10


@router.post("/blocos/iniciar", status_code=201)
def iniciar_bloco(
    payload: IniciarBlocoRequest,
    usuario: UsuarioLogado,
    session: Session = Depends(get_session),
):
    if payload.area not in VALORES_DE_AREA:
        raise HTTPException(status_code=400, detail="Área inválida")
    if payload.quantidade not in QUANTIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Quantidade inválida. Use 5, 10, 15 ou 20")

    itens_area = _questoes_da_area(payload.area)
    if not itens_area:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada para essa área")

    escolhidos = random.sample(
        itens_area,
        k=min(payload.quantidade, len(itens_area)),
    )
    registros: list[Questao] = []
    for item in escolhidos:
        questao = _buscar_questao_db(session, item["prova"], item["index"])
        if not questao:
            raise HTTPException(
                status_code=409,
                detail="Catálogo de questões não indexado. Execute python database/createdb.py.",
            )
        registros.append(questao)

    tentativa = TentativaBloco(
        usuario_id=usuario.id,
        area=payload.area,
        total_questoes=len(registros),
    )
    session.add(tentativa)
    session.flush()
    for ordem, questao in enumerate(registros, start=1):
        session.add(
            TentativaBlocoQuestao(
                tentativa_bloco_id=tentativa.id,
                questao_id=questao.id,
                ordem=ordem,
            )
        )
    session.commit()
    session.refresh(tentativa)

    return {
        "tentativa_id": tentativa.id,
        "area": payload.area,
        "quantidade": len(escolhidos),
        "questoes": [
            _montar_questao_publica(item["prova"], item["index"], session)
            for item in escolhidos
        ],
    }


class RespostaEnviada(BaseModel):
    prova: str
    index: str
    letra: str
    tempo_segundos: int | None = 0


class CorrecaoRequest(BaseModel):
    respostas: list[RespostaEnviada]
    tentativa_simulado_id: int | None = None
    tentativa_bloco_id: int | None = None


def _registrar_dia_estudo(
    session: Session,
    usuario_id: int,
    questoes: int = 0,
    flashcards: int = 0,
    tempo_segundos: int = 0,
) -> DiaEstudo:
    hoje = date.today()
    dia = session.exec(
        select(DiaEstudo).where(DiaEstudo.usuario_id == usuario_id, DiaEstudo.data == hoje)
    ).first()
    if not dia:
        dia = DiaEstudo(usuario_id=usuario_id, data=hoje)
    dia.questoes_respondidas += questoes
    dia.flashcards_revisados += flashcards
    dia.tempo_segundos += max(0, min(int(tempo_segundos or 0), 3600))
    session.add(dia)
    return dia


def _atualizar_progresso_questao(session: Session, usuario_id: int, questao: Questao, correta: bool) -> None:
    if not questao.tema_id:
        return
    progresso = session.exec(
        select(ProgressoTema).where(
            ProgressoTema.usuario_id == usuario_id,
            ProgressoTema.tema_id == questao.tema_id,
        )
    ).first()
    if not progresso:
        progresso = ProgressoTema(usuario_id=usuario_id, tema_id=questao.tema_id)
    progresso.questoes_respondidas += 1
    if correta:
        progresso.questoes_corretas += 1
    progresso.progresso = min(100, progresso.questoes_respondidas * 5 + progresso.flashcards_revisados * 5)
    progresso.status = "concluido" if progresso.progresso >= 100 else "em_andamento"
    progresso.atualizado_em = datetime.now()
    if progresso.status == "concluido" and progresso.concluido_em is None:
        progresso.concluido_em = datetime.now()
    session.add(progresso)


@router.post("/corrigir")
def corrigir_questoes(
    payload: CorrecaoRequest,
    usuario: UsuarioLogado,
    session: Session = Depends(get_session),
):
    """Corrige e registra cada resposta no histórico do usuário."""
    detalhes = []
    acertos = 0
    xp_ganhos = 0
    coins_ganhas = 0
    tentativa = None
    tentativa_bloco = None
    chaves_recebidas: set[tuple[str, str]] = set()

    if (
        payload.tentativa_simulado_id is not None
        and payload.tentativa_bloco_id is not None
    ):
        raise HTTPException(status_code=400, detail="Informe apenas uma atividade")

    if payload.tentativa_simulado_id is not None:
        tentativa = session.exec(
            select(TentativaSimulado)
            .where(TentativaSimulado.id == payload.tentativa_simulado_id)
            .with_for_update()
        ).first()
        if not tentativa or tentativa.usuario_id != usuario.id:
            raise HTTPException(status_code=404, detail="Tentativa de simulado não encontrada")
        if tentativa.finalizada:
            raise HTTPException(status_code=409, detail="Este simulado já foi finalizado")

    if payload.tentativa_bloco_id is not None:
        tentativa_bloco = session.exec(
            select(TentativaBloco)
            .where(TentativaBloco.id == payload.tentativa_bloco_id)
            .with_for_update()
        ).first()
        if not tentativa_bloco or tentativa_bloco.usuario_id != usuario.id:
            raise HTTPException(status_code=404, detail="Tentativa de bloco não encontrada")
        if tentativa_bloco.finalizada:
            raise HTTPException(status_code=409, detail="Este bloco já foi finalizado")

    tentativa_atividade = tentativa or tentativa_bloco
    if tentativa_atividade is not None:
        filtro_tentativa = (
            RespostaUsuario.tentativa_simulado_id == tentativa.id
            if tentativa is not None
            else RespostaUsuario.tentativa_bloco_id == tentativa_bloco.id
        )
        respostas_registradas = int(
            session.exec(
                select(func.count(RespostaUsuario.id)).where(filtro_tentativa)
            ).one()
            or 0
        )
        if respostas_registradas + len(payload.respostas) > tentativa_atividade.total_questoes:
            raise HTTPException(
                status_code=400,
                detail="A quantidade de respostas excede o total desta atividade",
            )

    for resposta in payload.respostas:
        chave_resposta = (resposta.prova, resposta.index)
        if chave_resposta in chaves_recebidas:
            raise HTTPException(status_code=400, detail="A mesma questão foi enviada mais de uma vez")
        chaves_recebidas.add(chave_resposta)

        dados = _ler_json_questao(resposta.prova, resposta.index)
        gabarito = dados.get("correctAlternative")
        correta = str(resposta.letra).strip().upper() == str(gabarito).strip().upper()
        questao = _buscar_questao_db(session, resposta.prova, resposta.index)
        if not questao:
            raise HTTPException(
                status_code=409,
                detail="Catálogo de questões não indexado. Execute python database/createdb.py.",
            )

        if tentativa is not None:
            pertence = session.exec(
                select(SimuladoQuestao).where(
                    SimuladoQuestao.simulado_id == tentativa.simulado_id,
                    SimuladoQuestao.questao_id == questao.id,
                )
            ).first()
            if not pertence:
                raise HTTPException(status_code=400, detail="Questão não pertence a este simulado")

            resposta_existente = session.exec(
                select(RespostaUsuario).where(
                    RespostaUsuario.usuario_id == usuario.id,
                    RespostaUsuario.tentativa_simulado_id == tentativa.id,
                    RespostaUsuario.questao_id == questao.id,
                )
            ).first()
            if resposta_existente:
                raise HTTPException(status_code=409, detail="Esta questão já foi registrada neste simulado")

        if tentativa_bloco is not None:
            pertence = session.exec(
                select(TentativaBlocoQuestao).where(
                    TentativaBlocoQuestao.tentativa_bloco_id == tentativa_bloco.id,
                    TentativaBlocoQuestao.questao_id == questao.id,
                )
            ).first()
            if not pertence:
                raise HTTPException(status_code=400, detail="Questão não pertence a este bloco")

            resposta_existente = session.exec(
                select(RespostaUsuario).where(
                    RespostaUsuario.usuario_id == usuario.id,
                    RespostaUsuario.tentativa_bloco_id == tentativa_bloco.id,
                    RespostaUsuario.questao_id == questao.id,
                )
            ).first()
            if resposta_existente:
                raise HTTPException(status_code=409, detail="Esta questão já foi registrada neste bloco")

        if correta:
            acertos += 1

        tempo_resposta = max(0, min(int(resposta.tempo_segundos or 0), 3600))
        session.add(
            RespostaUsuario(
                usuario_id=usuario.id,
                questao_id=questao.id,
                tentativa_simulado_id=payload.tentativa_simulado_id,
                tentativa_bloco_id=payload.tentativa_bloco_id,
                alternativa_escolhida=str(resposta.letra).strip().upper(),
                correta=correta,
                tempo_segundos=tempo_resposta,
            )
        )
        _registrar_dia_estudo(
            session, usuario.id, questoes=1, tempo_segundos=tempo_resposta
        )
        _atualizar_progresso_questao(session, usuario.id, questao, correta)
        xp, coins = recompensar_questao(usuario, correta)
        xp_ganhos += xp
        coins_ganhas += coins

        resolucao = session.exec(select(Resolucao).where(Resolucao.questao_id == questao.id)).first()
        detalhes.append({
            "prova": resposta.prova,
            "index": resposta.index,
            "letraEscolhida": resposta.letra,
            "correta": correta,
            "gabarito": gabarito,
            "resolucao": resolucao.texto if resolucao else None,
        })

    recalcular_streak(session, usuario)
    session.add(usuario)
    session.commit()

    return {
        "acertos": acertos,
        "total": len(payload.respostas),
        "xp_ganhos": xp_ganhos,
        "coins_ganhas": coins_ganhas,
        "saldo": {"xp": usuario.xp, "coins": usuario.coins, "streak": usuario.streak},
        "detalhes": detalhes,
    }


@router.post("/blocos/{tentativa_id}/finalizar")
def finalizar_bloco(
    tentativa_id: int,
    usuario: UsuarioLogado,
    session: Session = Depends(get_session),
):
    tentativa = session.exec(
        select(TentativaBloco)
        .where(TentativaBloco.id == tentativa_id)
        .with_for_update()
    ).first()
    if not tentativa or tentativa.usuario_id != usuario.id:
        raise HTTPException(status_code=404, detail="Tentativa de bloco não encontrada")

    if not tentativa.finalizada:
        tentativa.finalizada = True
        tentativa.finalizado_em = datetime.now()
        session.add(tentativa)

    resultado_xp = processar_xp_atividade(session, usuario.id, tentativa)
    recalcular_streak(session, usuario)
    session.commit()
    session.refresh(tentativa)
    session.refresh(usuario)

    return {
        "tentativa": tentativa,
        **resultado_xp,
        "progressao": progressao_usuario(session, usuario),
        "saldo": {
            "xp": usuario.xp,
            "coins": usuario.coins,
            "streak": usuario.streak,
        },
    }
