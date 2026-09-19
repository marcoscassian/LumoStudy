from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
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


def _garantir_itens_base(session: Session) -> None:
    alterado = False
    for casa_slug, (casa_nome, desenvolvedores) in CATALOGO_AVATARES.items():
        for nome_dev, slug_dev in desenvolvedores:
            slug_item = f"avatar-{slug_dev}-{casa_slug}"
            arquivo = f"/loja/avatares/{casa_slug}/{slug_dev}.png"
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
        if item.tipo == "avatar" and item.casa and item.casa != usuario.casa:
            continue
        saida.append(
            {
                "id": item.id,
                "nome": item.nome,
                "slug": item.slug,
                "descricao": item.descricao,
                "preco_coins": item.preco_coins,
                "arquivo": item.arquivo,
                "tipo": item.tipo,
                "casa": item.casa,
                "comprado": posse is not None,
                "equipado": bool(posse and posse.equipado),
            }
        )
    return saida


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


@router.post("/{item_id}/comprar")
def comprar_item(item_id: int, usuario: UsuarioLogado, session: SessionDep):
    _garantir_itens_base(session)
    item = session.get(ItemLoja, item_id)
    if not item or not item.ativo:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if item.tipo == "avatar" and item.casa and item.casa != usuario.casa:
        raise HTTPException(status_code=403, detail="Este avatar pertence a outra casa")

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

    usuario.coins -= item.preco_coins
    posse = UsuarioItem(usuario_id=usuario.id, item_id=item.id, equipado=False)
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
    return _resposta(session, usuario, f"{item.nome} comprado com sucesso!")


@router.post("/{item_id}/equipar")
def equipar_item(item_id: int, usuario: UsuarioLogado, session: SessionDep):
    _garantir_itens_base(session)
    item = session.get(ItemLoja, item_id)
    if not item or not item.ativo:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    if item.tipo not in {"avatar", "mascote"}:
        raise HTTPException(status_code=400, detail="Este tipo de item não pode ser equipado")
    if item.tipo == "avatar" and item.casa and item.casa != usuario.casa:
        raise HTTPException(status_code=403, detail="Este avatar pertence a outra casa")

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

    if item.tipo == "avatar":
        usuario.avatar_url = item.arquivo
        mensagem = f"{item.nome} agora é sua foto de perfil."
    else:
        usuario.mascote_slug = item.slug.removeprefix("mascote-")
        usuario.mascote_url = item.arquivo
        mensagem = f"{item.nome} agora entrega suas notificações."

    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return _resposta(session, usuario, mensagem)
