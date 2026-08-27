"""Cria o banco MySQL, aplica o Alembic e indexa as provas locais.

Uso, a partir da pasta backend:
    python database/createdb.py
"""

from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlmodel import Session, select

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from database.configdb import (  # noqa: E402
    MYSQL_CHARSET,
    MYSQL_DATABASE,
    MYSQL_HOST,
    MYSQL_PORT,
    MYSQL_USER,
    SERVER_URL,
)
from database.db import engine  # noqa: E402
from models.models import Area, Prova, Questao, Simulado, SimuladoQuestao, Tema, Usuarios  # noqa: E402
from services.progresso_service import garantir_metas_padrao  # noqa: E402

PROVAS_DIR = BACKEND_DIR / "database" / "provas"

AREAS = [
    ("linguagens", "Linguagens, Códigos e suas Tecnologias"),
    ("ciencias-humanas", "Ciências Humanas e suas Tecnologias"),
    ("matematica", "Matemática e suas Tecnologias"),
    ("ciencias-natureza", "Ciências da Natureza e suas Tecnologias"),
]

TEMAS = {
    "linguagens": ["Interpretação de Texto", "Literatura", "Gramática", "Artes", "Língua Estrangeira"],
    "ciencias-humanas": ["História", "Geografia", "Filosofia", "Sociologia"],
    "matematica": ["Álgebra", "Geometria", "Estatística e Probabilidade", "Matemática Financeira"],
    "ciencias-natureza": ["Biologia", "Física", "Química"],
}

PALAVRAS = {
    "Biologia": ["célula", "dna", "gene", "ecossistema", "espécie", "evolução", "fotossíntese", "vírus", "bactéria", "proteína"],
    "Física": ["velocidade", "aceleração", "força", "energia", "corrente elétrica", "tensão", "onda", "frequência", "potência", "gravidade", "calor"],
    "Química": ["reação", "átomo", "molécula", "ácido", "base", "oxidação", "substância", "solução", "concentração", "ph"],
    "História": ["guerra", "revolução", "império", "colonização", "ditadura", "independência", "república", "escravidão"],
    "Geografia": ["território", "urbanização", "clima", "relevo", "migração", "globalização", "agricultura", "mapa"],
    "Filosofia": ["filosofia", "filósofo", "ética", "razão", "conhecimento", "platão", "aristóteles", "kant"],
    "Sociologia": ["sociedade", "cultura", "classe social", "desigualdade", "movimento social", "cidadania", "trabalho"],
    "Álgebra": ["equação", "função", "polinômio", "incógnita", "variável", "logaritmo", "exponencial", "matriz"],
    "Geometria": ["área", "perímetro", "triângulo", "ângulo", "volume", "circunferência", "polígono", "raio", "trigonometria"],
    "Estatística e Probabilidade": ["probabilidade", "média", "mediana", "amostra", "gráfico", "porcentagem", "estatística", "frequência"],
    "Matemática Financeira": ["juros", "montante", "investimento", "financiamento", "desconto"],
    "Literatura": ["literatura", "literário", "poema", "romance", "poesia", "narrador"],
    "Gramática": ["gramática", "concordância", "verbo", "sintaxe", "morfologia", "ortografia"],
    "Artes": ["pintura", "escultura", "música", "obra de arte", "artista", "exposição"],
    "Interpretação de Texto": ["texto", "autor", "sentido", "linguagem", "expressão", "leitura"],
}


def slugify(valor: str) -> str:
    normalizado = unicodedata.normalize("NFKD", valor).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalizado.lower()).strip("-")


def chave_pasta(nome: str):
    match = re.match(r"(\d+)(.*)", nome)
    return (int(match.group(1)), match.group(2)) if match else (10**9, nome)


def texto_questao(dados: dict) -> str:
    partes = [dados.get("context") or "", dados.get("alternativesIntroduction") or ""]
    partes.extend(a.get("text") or "" for a in dados.get("alternatives", []))
    return " ".join(partes).lower()


def escolher_tema(area_slug: str, dados: dict) -> str:
    idioma = dados.get("language")
    if area_slug == "linguagens" and idioma:
        return "Língua Estrangeira"

    candidatos = TEMAS[area_slug]
    texto = texto_questao(dados)
    melhor = candidatos[0]
    melhor_pontos = -1
    for tema in candidatos:
        pontos = sum(texto.count(p) for p in PALAVRAS.get(tema, []))
        if pontos > melhor_pontos:
            melhor = tema
            melhor_pontos = pontos
    return melhor


def criar_banco() -> None:
    print(
        f"Conectando ao MySQL em {MYSQL_HOST}:{MYSQL_PORT} como {MYSQL_USER} "
        f"e preparando '{MYSQL_DATABASE}'..."
    )
    servidor = create_engine(SERVER_URL, isolation_level="AUTOCOMMIT", pool_pre_ping=True)
    with servidor.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{MYSQL_DATABASE}` "
                f"CHARACTER SET {MYSQL_CHARSET} COLLATE utf8mb4_unicode_ci"
            )
        )
    servidor.dispose()
    print(f"Banco '{MYSQL_DATABASE}' criado/verificado.")


def aplicar_migrations() -> None:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "migrations"))
    command.upgrade(config, "head")
    print("Migrations aplicadas até o head.")


def semear_catalogo() -> tuple[int, int, int]:
    with Session(engine) as session:
        areas_por_slug: dict[str, Area] = {}
        temas_por_area_nome: dict[tuple[str, str], Tema] = {}

        for ordem, (slug, nome) in enumerate(AREAS, start=1):
            area = session.exec(select(Area).where(Area.slug == slug)).first()
            if not area:
                area = Area(slug=slug, nome=nome, ordem=ordem)
                session.add(area)
                session.commit()
                session.refresh(area)
            areas_por_slug[slug] = area

            for tema_ordem, tema_nome in enumerate(TEMAS[slug], start=1):
                tema_slug = slugify(tema_nome)
                tema = session.exec(
                    select(Tema).where(Tema.area_id == area.id, Tema.slug == tema_slug)
                ).first()
                if not tema:
                    tema = Tema(area_id=area.id, nome=tema_nome, slug=tema_slug, ordem=tema_ordem)
                    session.add(tema)
                    session.commit()
                    session.refresh(tema)
                temas_por_area_nome[(slug, tema_nome)] = tema

        provas_count = 0
        questoes_count = 0
        for pasta_prova in sorted(PROVAS_DIR.glob("ENEM*")):
            if not pasta_prova.is_dir():
                continue
            info_path = pasta_prova / "details.json"
            info = json.loads(info_path.read_text(encoding="utf-8")) if info_path.exists() else {}
            codigo = pasta_prova.name
            ano = int(info.get("year") or re.sub(r"\D", "", codigo) or 0)
            nome = info.get("title") or f"ENEM {ano}"

            prova = session.exec(select(Prova).where(Prova.codigo == codigo)).first()
            if not prova:
                prova = Prova(codigo=codigo, nome=nome, ano=ano)
                session.add(prova)
                session.commit()
                session.refresh(prova)
            provas_count += 1

            pastas = sorted(
                [p for p in (pasta_prova / "questions").iterdir() if p.is_dir()],
                key=lambda p: chave_pasta(p.name),
            )
            por_area: dict[str, list[Path]] = {slug: [] for slug, _ in AREAS}
            dados_cache: dict[str, dict] = {}
            for pasta_q in pastas:
                arquivo = pasta_q / "details.json"
                if not arquivo.exists():
                    continue
                dados = json.loads(arquivo.read_text(encoding="utf-8"))
                dados_cache[pasta_q.name] = dados
                area_slug = dados.get("discipline")
                if area_slug in por_area:
                    por_area[area_slug].append(pasta_q)

            nivel_por_numero: dict[str, str] = {}
            for area_slug, itens in por_area.items():
                total = len(itens)
                corte1 = max(1, total // 3) if total else 0
                corte2 = max(corte1 + 1, (total * 2) // 3) if total else 0
                for pos, pasta_q in enumerate(itens):
                    nivel_por_numero[pasta_q.name] = "facil" if pos < corte1 else "medio" if pos < corte2 else "dificil"

            for pasta_q in pastas:
                dados = dados_cache.get(pasta_q.name)
                if not dados:
                    continue
                existente = session.exec(
                    select(Questao).where(Questao.prova_id == prova.id, Questao.numero == pasta_q.name)
                ).first()
                if existente:
                    questoes_count += 1
                    continue
                area_slug = dados.get("discipline")
                area = areas_por_slug.get(area_slug)
                if not area:
                    continue
                tema_nome = escolher_tema(area_slug, dados)
                tema = temas_por_area_nome[(area_slug, tema_nome)]
                relativa = pasta_q.relative_to(BACKEND_DIR).as_posix() + "/details.json"
                questao = Questao(
                    prova_id=prova.id,
                    numero=pasta_q.name,
                    area_id=area.id,
                    tema_id=tema.id,
                    disciplina=tema_nome,
                    nivel=nivel_por_numero.get(pasta_q.name, "medio"),
                    caminho_json=relativa,
                )
                session.add(questao)
                questoes_count += 1
            session.commit()

        # Cinco modelos simples: 4 por área + 1 geral, 12 questões cada.
        simulados_specs = [
            ("Linguagens - treino rápido", "linguagens"),
            ("Ciências Humanas - treino rápido", "ciencias-humanas"),
            ("Matemática - treino rápido", "matematica"),
            ("Ciências da Natureza - treino rápido", "ciencias-natureza"),
        ]
        simulados_count = 0
        for nome, area_slug in simulados_specs:
            simulado = session.exec(select(Simulado).where(Simulado.nome == nome)).first()
            if not simulado:
                simulado = Simulado(nome=nome, descricao="12 questões para prática rápida.", tempo_limite_minutos=36)
                session.add(simulado)
                session.commit()
                session.refresh(simulado)
            if not session.exec(select(SimuladoQuestao).where(SimuladoQuestao.simulado_id == simulado.id)).first():
                area = areas_por_slug[area_slug]
                questoes = session.exec(
                    select(Questao).where(Questao.area_id == area.id, Questao.ativa == True).order_by(Questao.id).limit(12)  # noqa: E712
                ).all()
                for ordem, questao in enumerate(questoes, start=1):
                    session.add(SimuladoQuestao(simulado_id=simulado.id, questao_id=questao.id, ordem=ordem))
                session.commit()
            simulados_count += 1

        geral_nome = "Simulado geral - treino rápido"
        geral = session.exec(select(Simulado).where(Simulado.nome == geral_nome)).first()
        if not geral:
            geral = Simulado(nome=geral_nome, descricao="12 questões misturando as quatro áreas.", tempo_limite_minutos=36)
            session.add(geral)
            session.commit()
            session.refresh(geral)
        if not session.exec(select(SimuladoQuestao).where(SimuladoQuestao.simulado_id == geral.id)).first():
            ordem = 1
            for area_slug, _ in AREAS:
                area = areas_por_slug[area_slug]
                questoes = session.exec(
                    select(Questao).where(Questao.area_id == area.id, Questao.ativa == True).order_by(Questao.id).limit(3)  # noqa: E712
                ).all()
                for questao in questoes:
                    session.add(SimuladoQuestao(simulado_id=geral.id, questao_id=questao.id, ordem=ordem))
                    ordem += 1
            session.commit()
        simulados_count += 1

        # Garante as metas padrão também para usuários que já existiam antes
        # da migration 0004. Para novos cadastros, a rota de usuário também
        # cria essas metas automaticamente.
        for usuario in session.exec(select(Usuarios)).all():
            garantir_metas_padrao(session, usuario.id)
        session.commit()

    return provas_count, questoes_count, simulados_count


def inicializar_banco() -> tuple[int, int, int]:
    """Cria banco, atualiza schema e sincroniza dados iniciais.

    É idempotente: pode ser chamado em toda inicialização do FastAPI.
    """
    criar_banco()
    aplicar_migrations()
    return semear_catalogo()


def main() -> None:
    provas, questoes, simulados = inicializar_banco()
    print(f"Catálogo sincronizado: {provas} provas, {questoes} questões e {simulados} simulados.")
    print("Banco MySQL do LumoStudy pronto para uso.")


if __name__ == "__main__":
    main()
