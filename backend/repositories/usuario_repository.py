from __future__ import annotations

from sqlmodel import Session, select

from models.models import Usuarios
from schemas.usuario_schema import UsuarioCreate


class UsuarioRepository:
    def __init__(self, session: Session):
        self.session = session

    def listar(self):
        return self.session.exec(select(Usuarios)).all()

    def get_by_id(self, usuario_id: int):
        return self.session.get(Usuarios, usuario_id)

    def get_by_email(self, email: str):
        email_normalizado = str(email).strip().lower()
        return self.session.exec(
            select(Usuarios).where(Usuarios.email == email_normalizado)
        ).first()

    def create(self, data: UsuarioCreate) -> Usuarios:
        usuario = Usuarios(
            nome=data.nome.strip(),
            email=str(data.email).strip().lower(),
            senha_hash=data.senha_hash,
            casa=data.casa or "corvinal",
            avatar_url=data.avatar_url or "/avatar.png",
            modo_escuro=bool(data.modo_escuro),
            tema_roxo_padrao=bool(data.tema_roxo_padrao),
            is_admin=False,
            coins=0,
            streak=0,
            xp=0,
        )
        self.session.add(usuario)
        self.session.commit()
        self.session.refresh(usuario)
        return usuario

    def save(self, usuario: Usuarios) -> Usuarios:
        self.session.add(usuario)
        self.session.commit()
        self.session.refresh(usuario)
        return usuario

    def delete(self, usuario: Usuarios) -> None:
        self.session.delete(usuario)
        self.session.commit()

    def obter_outro_com_email(self, email: str, usuario_id: int):
        email_normalizado = str(email).strip().lower()
        return self.session.exec(
            select(Usuarios).where(
                Usuarios.email == email_normalizado,
                Usuarios.id != usuario_id,
            )
        ).first()
