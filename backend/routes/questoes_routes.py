import json
import random
import re
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import Session, select

from database.database import get_session
from models.models import QuestaoEditorial

router = APIRouter(prefix="/questoes", tags=["questoes"])

BASE_DIR = Path(__file__).resolve().parent.parent / "database" / "provas"

AREAS = [
    {"label": "Linguagens, Códigos e suas Tecnologias", "value": "linguagens"},
    {"label": "Ciências Humanas e suas Tecnologias", "value": "ciencias-humanas"},
    {"label": "Matemática e suas Tecnologias", "value": "matematica"},
    {"label": "Ciências da Natureza e suas Tecnologias", "value": "ciencias-natureza"},
]

VALORES_DE_AREA = {area["value"] for area in AREAS}
NIVEIS_VALIDOS = {"facil", "medio", "dificil"}
QUANTIDADES_VALIDAS = {5, 10, 15, 20, 25}


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
    """Retorna [{prova, index, nivel}] para a área pedida, juntando todas as provas.
    Aqui 'index' é o nome real da pasta da questão (ex.: '12' ou '91-ingles'),
    não necessariamente um número puro, já que provas com opção de língua
    estrangeira guardam duas pastas para o mesmo número de questão.

    Sobre o 'nivel': o ENEM não publica uma tag oficial de dificuldade por
    questão. Como aproximação, calculamos a posição de cada questão dentro do
    bloco da área NA PRÓPRIA PROVA em que ela está (ex.: a questão é a 5ª das
    40 de Linguagens daquela prova) e dividimos esse bloco em três terços:
    o primeiro terço vira "fácil", o do meio "médio" e o último "difícil".
    Isso é feito por prova (não a lista combinada de todos os anos), para não
    misturar a ordem de anos diferentes. Não é uma classificação pedagógica
    oficial, é só uma forma de dar variedade entre os três níveis oferecidos
    na tela."""
    itens = []
    for prova in _listar_provas():
        pastas_da_area = [
            pasta for pasta in _pastas_de_questoes(prova)
            if _ler_json_questao(prova, pasta).get("discipline") == area
        ]

        total = len(pastas_da_area)
        corte1 = max(1, total // 3)
        corte2 = max(corte1 + 1, (total * 2) // 3)

        for posicao, pasta in enumerate(pastas_da_area):
            if posicao < corte1:
                nivel = "facil"
            elif posicao < corte2:
                nivel = "medio"
            else:
                nivel = "dificil"

            itens.append({"prova": prova, "index": pasta, "nivel": nivel})

    return itens


def _filtrar_por_nivel(itens: list[dict], nivel: str) -> list[dict]:
    filtrados = [item for item in itens if item["nivel"] == nivel]
    return filtrados or itens


# =======================================================================
# Classificação de assunto (matéria) por palavras-chave no enunciado.
#
# O ENEM também não marca a matéria específica de cada questão (ex.: se uma
# questão de Ciências da Natureza é de Física, Química ou Biologia). Como o
# app não tem acesso a essa informação oficial, aproximamos isso contando
# palavras-chave típicas de cada matéria no texto da questão e escolhendo a
# que aparecer com mais força. É uma heurística — pode errar em questões
# interdisciplinares ou com poucas palavras-chave — não uma classificação
# oficial do INEP.
# =======================================================================

PALAVRAS_CHAVE_ASSUNTO = {
    "ciencias-natureza": {
        "Biologia": [
            "célula", "celular", "dna", "gene", "genético", "organismo", "ecossistema",
            "espécie", "evolução", "proteína", "enzima", "metabolismo", "fotossíntese",
            "vírus", "bactéria", "população", "biodiversidade", "ecológic", "reprodução",
            "cromossomo", "tecido", "órgão", "sistema imunológico", "vacina", "microrganismo",
        ],
        "Química": [
            "química", "reação", "mol ", "átomo", "elemento químico", "ligação química",
            "solução", "concentração", "ph ", "ácido", "base ", "oxidação", "composto",
            "molécula", "tabela periódica", "combustão", "polímero", "substância",
            "elétron", "íon", "solvente", "soluto",
        ],
        "Física": [
            "física", "velocidade", "aceleração", "força", "newton", "energia cinética",
            "energia potencial", "campo elétrico", "corrente elétrica", "tensão elétrica",
            "resistor", "onda", "frequência", "potência", "movimento", "gravidade",
            "pressão", "temperatura", "calor", "termodinâmica", "óptica", "lente",
            "espelho", "circuito", "magnetismo", "eletromagnet",
        ],
    },
    "ciencias-humanas": {
        "História": [
            "história", "guerra", "revolução", "império", "colonização", "ditadura",
            "independência", "século", "monarquia", "república", "escravidão", "colônia",
        ],
        "Geografia": [
            "geografia", "território", "urbaniz", "clima", "relevo", "migração",
            "globalização", "agricultura", "recursos naturais", "mapa", "rural", "êxodo",
        ],
        "Filosofia": [
            "filosofia", "filósofo", "ética", "razão", "conhecimento", "existência",
            "platão", "aristóteles", "kant", "moral",
        ],
        "Sociologia": [
            "sociologia", "sociedade", "cultura", "classe social", "desigualdade",
            "movimento social", "identidade", "cidadania", "trabalho",
        ],
    },
    "matematica": {
        "Álgebra": [
            "equação", "função", "polinômio", "incógnita", "variável", "sistema de equações",
            "logaritmo", "exponencial", "inequação", "matriz",
        ],
        "Geometria": [
            "área", "perímetro", "triângulo", "ângulo", "volume", "circunferência",
            "figura geométrica", "polígono", "raio", "diâmetro", "trigonometria",
            "seno", "cosseno", "tangente", "escala", "planta",
        ],
        "Estatística e Probabilidade": [
            "probabilidade", "média", "mediana", "desvio", "amostra", "gráfico",
            "porcentagem", "estatística", "frequência relativa", "razão", "proporção",
            "sequência", "progressão aritmética", "progressão geométrica",
        ],
        "Matemática Financeira": ["juros", "montante", "investimento", "taxa de juros", "financiamento", "desconto"],
    },
    "linguagens": {
        "Literatura": ["literatura", "literário", "poema", "romance", "poesia", "narrador"],
        "Gramática": ["gramática", "concordância", "verbo", "sintaxe", "morfologia", "ortografia"],
        "Artes": ["pintura", "escultura", "música", "obra de arte", "artista", "exposição"],
    },
}


def _texto_para_classificacao(dados: dict) -> str:
    partes = [dados.get("context") or "", dados.get("alternativesIntroduction") or ""]
    for alternativa in dados.get("alternatives", []):
        partes.append(alternativa.get("text") or "")
    return " ".join(partes).lower()


def _classificar_assunto(area: str, dados: dict) -> str | None:
    idioma = dados.get("language")
    if area == "linguagens" and idioma:
        return "Inglês" if idioma == "ingles" else "Espanhol" if idioma == "espanhol" else None

    mapa_assuntos = PALAVRAS_CHAVE_ASSUNTO.get(area)
    if not mapa_assuntos:
        return None

    texto = _texto_para_classificacao(dados)

    melhor_assunto = None
    melhor_pontuacao = 0

    for assunto, palavras in mapa_assuntos.items():
        pontuacao = sum(texto.count(palavra) for palavra in palavras)
        if pontuacao > melhor_pontuacao:
            melhor_pontuacao = pontuacao
            melhor_assunto = assunto

    return melhor_assunto


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
            "texto": alternativa["text"],
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
        "enunciado": dados.get("context"),
        "comando": dados.get("alternativesIntroduction"),
        "imagens": imagens,
        "alternativas": alternativas,
        "gabarito": dados.get("correctAlternative"),
        "disciplinaOriginal": dados.get("discipline"),
    }


def _buscar_editorial(session: Session, prova: str, index: str) -> QuestaoEditorial | None:
    return session.exec(
        select(QuestaoEditorial).where(
            QuestaoEditorial.prova == prova,
            QuestaoEditorial.numero == index,
        )
    ).first()


def _montar_questao_publica(prova: str, index: str, nivel: str, session: Session) -> dict:
    dados = _ler_json_questao(prova, index)
    questao = _montar_questao_original(prova, index, dados)
    questao.pop("gabarito", None)
    editorial = _buscar_editorial(session, prova, index)
    assunto_automatico = _classificar_assunto(dados.get("discipline"), dados)
    questao.update({
        "nivel": nivel,
        "assunto": editorial.conteudo_principal if editorial else assunto_automatico,
        "disciplina": editorial.disciplina if editorial else None,
        "conteudoPrincipal": editorial.conteudo_principal if editorial else assunto_automatico,
    })
    return questao


@router.get("/areas")
def listar_areas():
    """Lista as 4 grandes áreas do ENEM disponíveis para praticar."""
    return AREAS


@router.get("/gerar")
def gerar_questoes(
    area: str = Query(..., description="linguagens, ciencias-humanas, matematica ou ciencias-natureza"),
    quantidade: int = Query(10),
    nivel: str = Query("medio", description="facil, medio ou dificil"),
    session: Session = Depends(get_session),
):
    if area not in VALORES_DE_AREA:
        raise HTTPException(status_code=400, detail="Área inválida")

    if quantidade not in QUANTIDADES_VALIDAS:
        raise HTTPException(status_code=400, detail="Quantidade inválida. Use 5, 10, 15, 20 ou 25")

    if nivel not in NIVEIS_VALIDOS:
        raise HTTPException(status_code=400, detail="Nível inválido. Use facil, medio ou dificil")

    itens_area = _questoes_da_area(area)
    itens_nivel = _filtrar_por_nivel(itens_area, nivel)

    if not itens_area:
        raise HTTPException(status_code=404, detail="Nenhuma questão encontrada para essa área")

    # Se o nível pedido não tiver questões suficientes (o banco atual só tem uma
    # prova, então cada nível fica com um terço das questões da área), completa
    # com questões de outros níveis da mesma área para sempre entregar a
    # quantidade pedida, quando a área tiver questões suficientes no total.
    if len(itens_nivel) < quantidade:
        faltando = quantidade - len(itens_nivel)
        chaves_ja_usadas = {(item["prova"], item["index"]) for item in itens_nivel}
        complemento = [
            item for item in itens_area
            if (item["prova"], item["index"]) not in chaves_ja_usadas
        ]
        random.shuffle(complemento)
        itens_nivel = itens_nivel + complemento[:faltando]

    escolhidos = random.sample(itens_nivel, k=min(quantidade, len(itens_nivel)))
    questoes = [
        _montar_questao_publica(item["prova"], item["index"], item["nivel"], session)
        for item in escolhidos
    ]

    return {
        "area": area,
        "nivel": nivel,
        "quantidade": len(questoes),
        "questoes": questoes,
    }


class RespostaEnviada(BaseModel):
    prova: str
    index: str
    letra: str


class CorrecaoRequest(BaseModel):
    respostas: list[RespostaEnviada]


@router.post("/corrigir")
def corrigir_questoes(payload: CorrecaoRequest, session: Session = Depends(get_session)):
    """Recebe as respostas escolhidas e devolve o gabarito de cada uma."""
    detalhes = []
    acertos = 0

    for resposta in payload.respostas:
        dados = _ler_json_questao(resposta.prova, resposta.index)
        gabarito = dados.get("correctAlternative")
        correta = str(resposta.letra).strip().upper() == str(gabarito).strip().upper()

        if correta:
            acertos += 1

        editorial = _buscar_editorial(session, resposta.prova, resposta.index)
        detalhes.append({
            "prova": resposta.prova,
            "index": resposta.index,
            "letraEscolhida": resposta.letra,
            "correta": correta,
            "gabarito": gabarito,
            "resolucao": editorial.resolucao if editorial else None,
        })

    return {
        "acertos": acertos,
        "total": len(payload.respostas),
        "detalhes": detalhes,
    }
