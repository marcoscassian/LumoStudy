from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import func, insert, literal
from sqlmodel import Session, select

from database.db import get_session
from models.models import Flashcard, Notificacao, Prova, Questao, QuestaoEditorial, Resolucao, Usuarios
from routes.login_routes import AdminLogado
from routes.questoes_routes import (
    _ler_json_questao,
    _listar_provas,
    _montar_questao_original,
    _pastas_de_questoes,
)

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/admin", tags=["admin"])


# monta o código da prova a partir do ano e verifica se ela existe.
def _prova_do_ano(ano: int) -> str:
    prova = f"ENEM{ano}"
    if prova not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    return prova


# confere se a questão existe nos arquivos e lê seus dados.
def _validar_questao_arquivo(prova: str, numero: str) -> dict:
    numero = str(numero).strip()
    if numero not in _pastas_de_questoes(prova):
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    return _ler_json_questao(prova, numero)


# procura a questão no banco usando a prova e o número.
def _buscar_questao_db(session: Session, prova: str, numero: str) -> Questao:
    questao = session.exec(
        select(Questao)
        .join(Prova, Prova.id == Questao.prova_id)
        .where(Prova.codigo == prova, Questao.numero == str(numero).strip())
    ).first()
    if not questao:
        raise HTTPException(
            status_code=409,
            detail="Questão ainda não foi indexada no MySQL. Execute python database/createdb.py.",
        )
    return questao


# organiza os dados do flashcard para devolver à interface.
def _flashcard_publico(flashcard: Flashcard) -> dict:
    return {
        "id": flashcard.id,
        "frente": flashcard.frente,
        "verso": flashcard.verso,
        "disciplina": flashcard.disciplina,
        "conteudo_principal": flashcard.conteudo_principal,
        "ativo": flashcard.ativo,
        "criado_por": flashcard.criado_por,
        "criado_em": flashcard.criado_em,
        "atualizado_em": flashcard.atualizado_em,
    }


# define os campos aceitos ao editar uma questão.
class QuestaoEditorialPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    resolucao: str | None = Field(default=None, max_length=20000)
    disciplina: str | None = Field(default=None, max_length=100)
    conteudo_principal: str | None = Field(default=None, max_length=150)

    # troca textos vazios por um valor nulo.
    @field_validator("resolucao", "disciplina", "conteudo_principal")
    @classmethod
    def vazio_vira_nulo(cls, valor: str | None):
        return valor or None


# define e valida os dados de uma notificação.
class NotificacaoAdminPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    usuario_id: int | None = Field(default=None, gt=0)
    enviar_para_todos: bool = False
    titulo: str = Field(default="Mensagem da equipe LumoStudy", min_length=1, max_length=120)
    mensagem: str = Field(min_length=1, max_length=5000)
    rota: str | None = Field(default=None, max_length=255)

    # transforma uma rota vazia em um valor nulo.
    @field_validator("rota")
    @classmethod
    def rota_vazia_vira_nulo(cls, valor: str | None):
        return valor or None

    # exige um usuário ou a confirmação de envio para todos.
    @model_validator(mode="after")
    def validar_destinatario(self):
        if self.enviar_para_todos and self.usuario_id is not None:
            raise ValueError("Não informe usuario_id ao enviar para todos")
        if not self.enviar_para_todos and self.usuario_id is None:
            raise ValueError("Informe usuario_id ou confirme o envio para todos")
        return self


# define os campos obrigatórios de um flashcard.
class FlashcardPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    frente: str = Field(min_length=1, max_length=5000)
    verso: str = Field(min_length=1, max_length=10000)
    disciplina: str = Field(min_length=1, max_length=100)
    conteudo_principal: str = Field(min_length=1, max_length=150)
    ativo: bool = True


# devolve os dados do administrador autenticado.
@router.get("/me")
def admin_atual(admin: AdminLogado):
    return {"id": admin.id, "nome": admin.nome, "email": admin.email, "is_admin": True}


# lista provas ativas e inclui arquivos ainda não sincronizados.
@router.get("/provas")
def listar_provas_admin(admin: AdminLogado, session: SessionDep):
    provas_db = session.exec(select(Prova)).all()
    codigos_sincronizados = {prova.codigo for prova in provas_db}
    catalogo = {
        prova.codigo: {"prova": prova.codigo, "ano": prova.ano}
        for prova in provas_db
        if prova.ativa
    }

    # Inclui arquivos ainda não sincronizados sem reativar provas desativadas no banco.
    for codigo in _listar_provas():
        ano = codigo.removeprefix("ENEM")
        if codigo not in codigos_sincronizados and ano.isdigit():
            catalogo[codigo] = {"prova": codigo, "ano": int(ano)}

    return sorted(
        catalogo.values(),
        key=lambda item: (item["ano"], item["prova"]),
        reverse=True,
    )


# retorna a questão original, o editorial e a resolução.
@router.get("/questoes/buscar")
def buscar_questao(
    admin: AdminLogado,
    session: SessionDep,
    ano: int = Query(..., ge=1990, le=2200),
    numero: str = Query(..., min_length=1, max_length=30),
):
    prova = _prova_do_ano(ano)
    dados = _validar_questao_arquivo(prova, numero)
    questao = _buscar_questao_db(session, prova, numero)
    editorial = session.exec(
        select(QuestaoEditorial).where(QuestaoEditorial.questao_id == questao.id)
    ).first()
    resolucao = session.exec(
        select(Resolucao).where(Resolucao.questao_id == questao.id)
    ).first()
    return {
        "original": _montar_questao_original(prova, numero, dados),
        "editorial": editorial,
        "resolucao": resolucao,
    }


# salva o editorial e cria, atualiza ou apaga a resolução.
@router.put("/questoes/{prova}/{numero}/editorial")
def salvar_editorial(
    prova: str,
    numero: str,
    payload: QuestaoEditorialPayload,
    admin: AdminLogado,
    session: SessionDep,
):
    prova = prova.strip().upper()
    if prova not in _listar_provas():
        raise HTTPException(status_code=404, detail="Prova não encontrada")
    _validar_questao_arquivo(prova, numero)
    questao = _buscar_questao_db(session, prova, numero)

    editorial = session.exec(
        select(QuestaoEditorial).where(QuestaoEditorial.questao_id == questao.id)
    ).first()
    agora = datetime.now()
    if editorial is None:
        editorial = QuestaoEditorial(questao_id=questao.id, criado_em=agora)

    editorial.disciplina = payload.disciplina
    editorial.conteudo_principal = payload.conteudo_principal
    editorial.atualizado_por = admin.id
    editorial.atualizado_em = agora
    session.add(editorial)
    resolucao = session.exec(
        select(Resolucao).where(Resolucao.questao_id == questao.id)
    ).first()
    if payload.resolucao:
        if resolucao is None:
            resolucao = Resolucao(questao_id=questao.id, criado_por=admin.id)
        resolucao.texto = payload.resolucao
        resolucao.criado_por = resolucao.criado_por or admin.id
        resolucao.atualizado_em = agora
        session.add(resolucao)
    elif resolucao is not None:
        session.delete(resolucao)
        resolucao = None
    session.commit()
    session.refresh(editorial)
    return {"editorial": editorial, "resolucao": resolucao}


# lista flashcards com filtros e paginação.
@router.get("/flashcards")
def listar_flashcards_admin(
    admin: AdminLogado,
    session: SessionDep,
    busca: str | None = None,
    disciplina: str | None = None,
    ativo: bool | None = None,
    limite: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    consulta = select(Flashcard)
    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(
            (Flashcard.frente.ilike(termo)) | (Flashcard.verso.ilike(termo))
        )
    if disciplina and disciplina.strip():
        consulta = consulta.where(Flashcard.disciplina == disciplina.strip())
    if ativo is not None:
        consulta = consulta.where(Flashcard.ativo == ativo)
    cards = session.exec(
        consulta.order_by(Flashcard.atualizado_em.desc()).offset(offset).limit(limite)
    ).all()
    return [_flashcard_publico(flashcard) for flashcard in cards]


# cadastra um flashcard novo.
@router.post("/flashcards", status_code=201)
def criar_flashcard(payload: FlashcardPayload, admin: AdminLogado, session: SessionDep):
    flashcard = Flashcard(**payload.model_dump(), criado_por=admin.id)
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return _flashcard_publico(flashcard)


# busca um flashcard pelo id.
@router.get("/flashcards/{flashcard_id}")
def obter_flashcard(flashcard_id: int, admin: AdminLogado, session: SessionDep):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    return _flashcard_publico(flashcard)


# atualiza os dados de um flashcard existente.
@router.put("/flashcards/{flashcard_id}")
def editar_flashcard(
    flashcard_id: int,
    payload: FlashcardPayload,
    admin: AdminLogado,
    session: SessionDep,
):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    for campo, valor in payload.model_dump().items():
        setattr(flashcard, campo, valor)
    flashcard.atualizado_em = datetime.now()
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return _flashcard_publico(flashcard)


# ativa ou desativa um flashcard.
@router.patch("/flashcards/{flashcard_id}/status")
def alterar_status_flashcard(
    flashcard_id: int,
    ativo: bool,
    admin: AdminLogado,
    session: SessionDep,
):
    flashcard = session.get(Flashcard, flashcard_id)
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard não encontrado")
    flashcard.ativo = ativo
    flashcard.atualizado_em = datetime.now()
    session.add(flashcard)
    session.commit()
    session.refresh(flashcard)
    return _flashcard_publico(flashcard)


# lista usuários e permite pesquisar por nome ou e-mail.
@router.get("/usuarios")
def listar_usuarios_admin(
    admin: AdminLogado,
    session: SessionDep,
    busca: str | None = Query(default=None, max_length=150),
):
    consulta = select(Usuarios)
    if busca and busca.strip():
        termo = f"%{busca.strip()}%"
        consulta = consulta.where(
            (Usuarios.nome.ilike(termo)) | (Usuarios.email.ilike(termo))
        )
    usuarios = session.exec(
        consulta.order_by(Usuarios.nome, Usuarios.email).limit(200)
    ).all()
    return [
        {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": str(usuario.email),
            "curso": usuario.curso,
            "casa": usuario.casa,
            "is_admin": usuario.is_admin,
        }
        for usuario in usuarios
    ]


# envia uma notificação a um usuário ou a todos.
@router.post("/notificacoes", status_code=201)
def enviar_notificacao_admin(
    payload: NotificacaoAdminPayload,
    admin: AdminLogado,
    session: SessionDep,
):
    if payload.enviar_para_todos:
        quantidade = session.exec(select(func.count(Usuarios.id))).one()
        if quantidade == 0:
            raise HTTPException(status_code=404, detail="Nenhum usuário encontrado")

        agora = datetime.now()
        session.execute(
            insert(Notificacao).from_select(
                ["usuario_id", "titulo", "mensagem", "tipo", "rota", "lida", "criada_em"],
                select(
                    Usuarios.id,
                    literal(payload.titulo),
                    literal(payload.mensagem),
                    literal("admin"),
                    literal(payload.rota),
                    literal(False),
                    literal(agora),
                ),
            )
        )
        mensagem = "Notificação enviada para todos os usuários."
    else:
        destinatario = session.get(Usuarios, payload.usuario_id)
        if not destinatario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        session.add(
            Notificacao(
                usuario_id=destinatario.id,
                titulo=payload.titulo,
                mensagem=payload.mensagem,
                tipo="admin",
                rota=payload.rota,
                lida=False,
            )
        )
        quantidade = 1
        mensagem = f"Notificação enviada para {destinatario.nome}."

    session.commit()
    return {"mensagem": mensagem, "quantidade": quantidade}

