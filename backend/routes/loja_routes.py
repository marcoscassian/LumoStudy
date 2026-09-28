from typing import Annotated, Literal

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database.db import get_session
from models.models import ItemLoja, Notificacao, UsuarioItem
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/loja", tags=["loja"])

MASCOTE_PADRAO = {
    "slug": "coruja",
    "nome": "Coruja",
    "arquivo": "/sprites/mascotes/coruja.png",
}

CATALOGO_AVATARES = {
    "corvinal": ("Corvinal", [("Ludimila", "ludimila"), ("Ícaro", "icaro"), ("Alex", "alex"), ("Marcos", "marcos")]),
    "grifinoria": ("Grifinória", [("Ludimila", "ludimila"), ("Ícaro", "icaro"), ("Alex", "alex"), ("Marcos", "marcos")]),
    "sonserina": ("Sonserina", [("Ludimila", "ludimila"), ("Ícaro", "icaro"), ("Alex", "alex"), ("Marcos", "marcos")]),
    "lufa-lufa": ("Lufa-Lufa", [("Ludimila", "ludimila"), ("Ícaro", "icaro"), ("Alex", "alex"), ("Marcos", "marcos")]),
}

CATALOGO_MASCOTES = [
    ("Gato", "mascote-gato", "/sprites/mascotes/gato.png", 50),
    ("Sapo", "mascote-sapo", "/sprites/mascotes/sapo.png", 60),
    ("Rato", "mascote-rato", "/sprites/mascotes/rato.png", 75),
    ("Serpente", "mascote-serpente", "/sprites/mascotes/serpente.png", 100),
]
CURSOR_VARINHA = ("Varinha mágica", "cursor-varinha", "/loja/mouse/varinha.png", 100)

CASAS_POR_SUFIXO = {
    "corvinal": "c",
    "grifinoria": "g",
    "sonserina": "s",
    "lufa-lufa": "l",
}
PASTAS_CASAS = {
    "corvinal": "corvinal",
    "grifinoria": "grifinoria",
    "sonserina": "sonserina",
    "lufa-lufa": "luflufa",
}
NOMES_AVATARES = {
    slug: nome_dev
    for _nome_casa, desenvolvedores in CATALOGO_AVATARES.values()
    for nome_dev, slug in desenvolvedores
}


class PersonalizacaoAvatar(BaseModel):
    casa: Literal["corvinal", "grifinoria", "sonserina", "lufa-lufa"]
    roupa: Literal["uniforme", "sobre-tudo", "casual", "noite"]


def _arquivo_personalizado(item: ItemLoja, personalizacao: PersonalizacaoAvatar) -> str:
    pessoa = item.slug.removeprefix("avatar-").split("-")[0]
    casa = personalizacao.casa
    base = f"/loja/avatares/{PASTAS_CASAS[casa]}/{pessoa}{CASAS_POR_SUFIXO[casa]}"
    return f"{base}.png" if personalizacao.roupa == "uniforme" else f"{base}-{personalizacao.roupa}.png"


def _arquivo_retrato(item: ItemLoja) -> str:
    pessoa = item.slug.removeprefix("avatar-").split("-")[0]
    casa = item.casa or "grifinoria"
    sufixo = CASAS_POR_SUFIXO.get(casa, "g")
    pasta = PASTAS_CASAS.get(casa, "grifinoria")
    return f"/loja/avatares/{pasta}/{pessoa}{sufixo}.png"


def _garantir_itens_base(session: Session) -> None:
    alterado = False
    for casa_slug, (casa_nome, desenvolvedores) in CATALOGO_AVATARES.items():
        for nome_dev, slug_dev in desenvolvedores:
            slug_item = f"avatar-{slug_dev}-{casa_slug}"
            arquivo = f"/loja/avatares/{PASTAS_CASAS[casa_slug]}/{slug_dev}{CASAS_POR_SUFIXO[casa_slug]}.png"
            nome_item = f"{nome_dev} · {casa_nome}"
            item = session.exec(select(ItemLoja).where(ItemLoja.slug == slug_item)).first()
            if not item:
                item = ItemLoja(
                    nome=nome_item,
                    slug=slug_item,
                    descricao=f"Versão {casa_nome} de {nome_dev}",
                    preco_coins=10,
                    arquivo=arquivo,
                    tipo="avatar",
                    casa=casa_slug,
                    ativo=True,
                )
                session.add(item)
                alterado = True
            elif item.arquivo != arquivo:
                item.arquivo = arquivo
                session.add(item)
                alterado = True
    for nome_item, slug_item, arquivo, preco in CATALOGO_MASCOTES:
        item = session.exec(select(ItemLoja).where(ItemLoja.slug == slug_item)).first()
        if not item:
            item = ItemLoja(
                nome=nome_item,
                slug=slug_item,
                descricao=f"Mascote {nome_item.lower()} para entregar suas notificações",
                preco_coins=preco,
                arquivo=arquivo,
                tipo="mascote",
                casa=None,
                ativo=True,
            )
            session.add(item)
            alterado = True
        else:
            if not item.ativo:
                item.ativo = True
                session.add(item)
                alterado = True
    nome, slug, arquivo, preco = CURSOR_VARINHA
    cursor = session.exec(select(ItemLoja).where(ItemLoja.slug == slug)).first()
    if not cursor:
        session.add(ItemLoja(
            nome=nome,
            slug=slug,
            descricao="Uma varinha encantada para acompanhar o ponteiro do mouse.",
            preco_coins=preco,
            arquivo=arquivo,
            tipo="cursor",
            casa=None,
            ativo=True,
        ))
        alterado = True
    elif cursor.arquivo != arquivo or cursor.preco_coins != preco or not cursor.ativo:
        cursor.arquivo = arquivo
        cursor.preco_coins = preco
        cursor.ativo = True
        session.add(cursor)
        alterado = True
    if alterado:
        session.commit()


def _itens_com_posse(session: Session, usuario_id: int) -> list[tuple[ItemLoja, UsuarioItem | None]]:
    itens = session.exec(
        select(ItemLoja).where(ItemLoja.ativo == True).order_by(ItemLoja.tipo, ItemLoja.id)  # noqa: E712
    ).all()
    posses = session.exec(select(UsuarioItem).where(UsuarioItem.usuario_id == usuario_id)).all()
    posse_por_item = {posse.item_id: posse for posse in posses}
    return [(item, posse_por_item.get(item.id)) for item in itens]


def _catalogo(session: Session, usuario) -> list[dict]:
    saida: list[dict] = []
    for item, posse in _itens_com_posse(session, usuario.id):
        # O curso/casa é a identidade do aluno. Avatares de outras casas não aparecem.
        saida.append(
            {
                "id": item.id,
                "nome": NOMES_AVATARES.get(item.slug.removeprefix("avatar-").split("-")[0], item.nome),
                "slug": item.slug,
                "descricao": item.descricao,
                "preco_coins": item.preco_coins,
                "arquivo": (
                    f"/loja/avatares/fotosneutras/{item.slug.removeprefix('avatar-').split('-')[0]}d.png"
                    if item.tipo == "avatar"
                    else item.arquivo
                ),
                "arquivo_legado": _arquivo_retrato(item) if item.tipo == "avatar" else None,
                "arquivo_personalizado": posse.arquivo_personalizado if posse else None,
                "tipo": item.tipo,
                "casa": None if item.tipo == "avatar" else item.casa,
                "comprado": posse is not None,
                "equipado": bool(posse and posse.equipado),
            }
        )
    avatares: dict[str, dict] = {}
    outros = []
    for item in saida:
        if item["tipo"] != "avatar":
            outros.append(item)
            continue
        slug_personagem = item["slug"].removeprefix("avatar-").split("-")[0]
        atual = avatares.get(slug_personagem)
        if atual is None or item["equipado"] or (item["comprado"] and not atual["comprado"]):
            avatares[slug_personagem] = item
    for item in avatares.values():
        comprado = [
            par for par in _itens_com_posse(session, usuario.id)
            if par[0].tipo == "avatar"
            and par[0].slug.removeprefix("avatar-").split("-")[0] == item["slug"].removeprefix("avatar-").split("-")[0]
            and par[1] is not None
        ]
        item["comprado"] = bool(comprado)
        item["equipado"] = any(posse.equipado for _, posse in comprado)
        equipada = next((posse for _, posse in comprado if posse.equipado), None)
        personalizada = next((posse for _, posse in comprado if posse.arquivo_personalizado), None)
        item["arquivo_personalizado"] = (equipada or personalizada).arquivo_personalizado if (equipada or personalizada) else None
    return outros + list(avatares.values())


def _desequipar_tipo(session: Session, usuario_id: int, tipo: str) -> None:
    posses = session.exec(select(UsuarioItem).where(UsuarioItem.usuario_id == usuario_id)).all()
    if not posses:
        return
    itens = {
        item.id: item
        for item in session.exec(
            select(ItemLoja).where(ItemLoja.id.in_([posse.item_id for posse in posses]))
        ).all()
    }
    for posse in posses:
        item = itens.get(posse.item_id)
        if posse.equipado and item and item.tipo == tipo:
            posse.equipado = False
            session.add(posse)


def _resposta(session: Session, usuario, mensagem: str | None = None) -> dict:
    resposta = {
        "coins": usuario.coins,
        "curso": usuario.curso,
        "casa": usuario.casa,
        "avatar_url": usuario.avatar_url,
        "mascote_slug": usuario.mascote_slug,
        "mascote_url": usuario.mascote_url,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
        "mascote_padrao": MASCOTE_PADRAO,
        "itens": _catalogo(session, usuario),
    }
    if mensagem:
        resposta["mensagem"] = mensagem
    return resposta


@router.get("")
def listar_loja(usuario: UsuarioLogado, session: SessionDep):
    _garantir_itens_base(session)
    return _resposta(session, usuario)


@router.post("/equipar-padrao")
def equipar_avatar_padrao(usuario: UsuarioLogado, session: SessionDep):
    """Volta para a foto padrão sem mexer no mascote equipado."""
    _desequipar_tipo(session, usuario.id, "avatar")
    usuario.avatar_url = "/avatar.png"
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return _resposta(session, usuario, "Foto de perfil padrão selecionada.")


@router.post("/equipar-mascote-padrao")
def equipar_mascote_padrao(usuario: UsuarioLogado, session: SessionDep):
    """A coruja é grátis, padrão e pode ser reequipada a qualquer momento."""
    _desequipar_tipo(session, usuario.id, "mascote")
    usuario.mascote_slug = MASCOTE_PADRAO["slug"]
    usuario.mascote_url = MASCOTE_PADRAO["arquivo"]
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return _resposta(session, usuario, "Sua coruja voltou a entregar as notificações.")


@router.post("/equipar-cursor-padrao")
def equipar_cursor_padrao(usuario: UsuarioLogado, session: SessionDep):
    _desequipar_tipo(session, usuario.id, "cursor")
    session.commit()
    return _resposta(session, usuario, "Seta padrÃ£o selecionada como ponteiro do mouse.")


@router.post("/{item_id}/comprar")
def comprar_item(
    item_id: int,
    usuario: UsuarioLogado,
    session: SessionDep,
    personalizacao: PersonalizacaoAvatar | None = Body(default=None),
):
    _garantir_itens_base(session)
    item = session.get(ItemLoja, item_id)
    if not item or not item.ativo:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    ja_tem = session.exec(
        select(UsuarioItem).where(
            UsuarioItem.usuario_id == usuario.id,
            UsuarioItem.item_id == item.id,
        )
    ).first()
    if ja_tem:
        raise HTTPException(status_code=409, detail="Você já comprou este item")

    if usuario.coins < item.preco_coins:
        raise HTTPException(status_code=400, detail="Moedas insuficientes para esta compra")
    if personalizacao is not None and item.tipo != "avatar":
        raise HTTPException(status_code=400, detail="A personalização está disponível para avatares")

    usuario.coins -= item.preco_coins
    posse = UsuarioItem(usuario_id=usuario.id, item_id=item.id, equipado=False)
    mensagem = f"{item.nome} comprado com sucesso!"
    if personalizacao is not None:
        _desequipar_tipo(session, usuario.id, "avatar")
        posse.arquivo_personalizado = _arquivo_personalizado(item, personalizacao)
        posse.equipado = True
        usuario.avatar_url = posse.arquivo_personalizado
        mensagem = "Avatar personalizado e equipado com sucesso!"
    elif item.tipo == "cursor":
        _desequipar_tipo(session, usuario.id, "cursor")
        posse.equipado = True
        mensagem = "Varinha comprada e equipada como ponteiro do mouse!"
    session.add(usuario)
    session.add(posse)
    session.add(
        Notificacao(
            usuario_id=usuario.id,
            titulo="Novo item desbloqueado",
            mensagem=f"{item.nome} agora faz parte da sua coleção.",
            tipo="loja",
            rota="/loja",
        )
    )
    session.commit()
    session.refresh(usuario)
    return _resposta(session, usuario, mensagem)


@router.post("/{item_id}/equipar")
def equipar_item(item_id: int, usuario: UsuarioLogado, session: SessionDep):
    _garantir_itens_base(session)
    item = session.get(ItemLoja, item_id)
    if not item or not item.ativo:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if item.tipo not in {"avatar", "mascote", "cursor"}:
        raise HTTPException(status_code=400, detail="Este tipo de item não pode ser equipado")
    posse = session.exec(
        select(UsuarioItem).where(
            UsuarioItem.usuario_id == usuario.id,
            UsuarioItem.item_id == item.id,
        )
    ).first()
    if not posse:
        raise HTTPException(status_code=403, detail="Compre este item antes de equipá-lo")

    _desequipar_tipo(session, usuario.id, item.tipo)
    posse.equipado = True
    session.add(posse)
    mensagem = f"{item.nome} equipado com sucesso."

    if item.tipo == "avatar":
        usuario.avatar_url = posse.arquivo_personalizado or item.arquivo
        mensagem = f"{item.nome} agora é sua foto de perfil."
    elif item.tipo == "mascote":
        usuario.mascote_slug = item.slug.removeprefix("mascote-")
        usuario.mascote_url = item.arquivo
        mensagem = f"{item.nome} agora entrega suas notificações."

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return _resposta(session, usuario, mensagem)
