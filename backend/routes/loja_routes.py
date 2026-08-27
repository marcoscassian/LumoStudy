from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from database.db import get_session
from models.models import ItemLoja, UsuarioItem
from routes.login_routes import UsuarioLogado

SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/loja", tags=["loja"])


def _catalogo(session: Session, usuario_id: int) -> list[dict]:
    itens = session.exec(
        select(ItemLoja).where(ItemLoja.ativo == True).order_by(ItemLoja.id)  # noqa: E712
    ).all()
    posses = session.exec(
        select(UsuarioItem).where(UsuarioItem.usuario_id == usuario_id)
    ).all()
    posse_por_item = {posse.item_id: posse for posse in posses}

    return [
        {
            "id": item.id,
            "nome": item.nome,
            "slug": item.slug,
            "descricao": item.descricao,
            "preco_coins": item.preco_coins,
            "arquivo": item.arquivo,
            "tipo": item.tipo,
            "casa": item.casa,
            "comprado": item.id in posse_por_item,
            "equipado": bool(posse_por_item.get(item.id) and posse_por_item[item.id].equipado),
        }
        for item in itens
    ]


@router.get("")
def listar_loja(usuario: UsuarioLogado, session: SessionDep):
    return {
        "coins": usuario.coins,
        "avatar_url": usuario.avatar_url,
        "casa": usuario.casa,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
        "itens": _catalogo(session, usuario.id),
    }


@router.post("/{item_id}/comprar")
def comprar_item(item_id: int, usuario: UsuarioLogado, session: SessionDep):
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

    usuario.coins -= item.preco_coins
    posse = UsuarioItem(usuario_id=usuario.id, item_id=item.id, equipado=False)
    session.add(usuario)
    session.add(posse)
    session.commit()

    return {
        "mensagem": f"{item.nome} comprado com sucesso!",
        "coins": usuario.coins,
        "itens": _catalogo(session, usuario.id),
    }


@router.post("/{item_id}/equipar")
def equipar_item(item_id: int, usuario: UsuarioLogado, session: SessionDep):
    item = session.get(ItemLoja, item_id)
    if not item or not item.ativo:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    posse = session.exec(
        select(UsuarioItem).where(
            UsuarioItem.usuario_id == usuario.id,
            UsuarioItem.item_id == item.id,
        )
    ).first()
    if not posse:
        raise HTTPException(status_code=403, detail="Compre este item antes de equipá-lo")

    equipados = session.exec(
        select(UsuarioItem).where(
            UsuarioItem.usuario_id == usuario.id,
            UsuarioItem.equipado == True,  # noqa: E712
        )
    ).all()
    for atual in equipados:
        atual.equipado = False
        session.add(atual)

    posse.equipado = True
    usuario.avatar_url = item.arquivo
    if item.casa:
        usuario.casa = item.casa
    session.add(posse)
    session.add(usuario)
    session.commit()

    return {
        "mensagem": f"{item.nome} agora é sua foto de perfil.",
        "avatar_url": usuario.avatar_url,
        "casa": usuario.casa,
        "tema_roxo_padrao": usuario.tema_roxo_padrao,
        "coins": usuario.coins,
        "itens": _catalogo(session, usuario.id),
    }
