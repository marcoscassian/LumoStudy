from __future__ import annotations

from fastapi import HTTPException
from pwdlib import PasswordHash

from repositories.usuario_repository import UsuarioRepository
from schemas.usuario_schema import PerfilPublico, UsuarioCreate, UsuarioUpdate
from services.progresso_service import garantir_metas_padrao

senha_context = PasswordHash.recommended()


class UsuarioService:
    def __init__(self, repo: UsuarioRepository):
        self.repo = repo

    def listar_usuarios(self):
        return self.repo.listar()

    def obter_por_id(self, usuario_id: int):
        usuario = self.repo.get_by_id(usuario_id)
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return usuario

    def criar_usuario(self, data: UsuarioCreate):
        email = str(data.email).strip().lower()
        if self.repo.get_by_email(email):
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")

        usuario = self.repo.create(
            UsuarioCreate(
                nome=data.nome,
                email=email,
                senha_hash=senha_context.hash(data.senha_hash),
                casa=data.casa,
                avatar_url=data.avatar_url,
                modo_escuro=data.modo_escuro,
                tema_roxo_padrao=data.tema_roxo_padrao,
            )
        )
        garantir_metas_padrao(self.repo.session, usuario.id)
        self.repo.session.commit()
        return usuario

    def atualizar_perfil(self, usuario, dados: UsuarioUpdate):
        if dados.nome is not None:
            nome = str(dados.nome).strip()
            if not nome:
                raise HTTPException(status_code=400, detail="Nome não pode ficar vazio")
            usuario.nome = nome

        if dados.email is not None:
            email = str(dados.email).strip().lower()
            if not email:
                raise HTTPException(status_code=400, detail="E-mail não pode ficar vazio")
            if self.repo.obter_outro_com_email(email, usuario.id):
                raise HTTPException(status_code=400, detail="E-mail já cadastrado")
            usuario.email = email

        if dados.modo_escuro is not None:
            usuario.modo_escuro = bool(dados.modo_escuro)

        if dados.tema_roxo_padrao is not None:
            usuario.tema_roxo_padrao = bool(dados.tema_roxo_padrao)

        if dados.nova_senha is not None and str(dados.nova_senha).strip():
            nova_senha = str(dados.nova_senha).strip()
            if not dados.senha_atual or not senha_context.verify(password=dados.senha_atual, hash=usuario.senha_hash):
                raise HTTPException(status_code=400, detail="Senha atual incorreta")
            if len(nova_senha) < 6:
                raise HTTPException(status_code=400, detail="A nova senha deve ter pelo menos 6 caracteres")
            usuario.senha_hash = senha_context.hash(nova_senha)

        return self.repo.save(usuario)

    def perfil_publico(self, usuario):
        return PerfilPublico.model_validate(usuario).model_dump()
