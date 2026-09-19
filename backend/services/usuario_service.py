from __future__ import annotations

from fastapi import HTTPException
from pwdlib import PasswordHash

from models.models import Notificacao
from repositories.usuario_repository import UsuarioRepository
from schemas.usuario_schema import PerfilPublico, UsuarioCreate, UsuarioUpdate
from services.identidade_service import casa_do_curso, normalizar_curso
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

        curso = normalizar_curso(data.curso)
        casa = casa_do_curso(curso)
        usuario = self.repo.create(
            UsuarioCreate(
                nome=data.nome,
                email=email,
                senha_hash=senha_context.hash(data.senha_hash),
                curso=curso,
                casa=casa,
                avatar_url="/avatar.png",
                mascote_slug="coruja",
                mascote_url="/sprites/mascotes/coruja.png",
                modo_escuro=False,
                tema_roxo_padrao=False,
            )
        )
        garantir_metas_padrao(self.repo.session, usuario.id)
        self.repo.session.add(
            Notificacao(
                usuario_id=usuario.id,
                titulo="Sua carta chegou!",
                mensagem="Bem-vindo ao LumoStudy. Sua coruja ficará aqui para entregar avisos, conquistas e lembretes de estudo.",
                tipo="boas_vindas",
                rota="/trilha",
            )
        )
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
            usuario.auth_version += 1

        return self.repo.save(usuario)

    def perfil_publico(self, usuario):
        return PerfilPublico.model_validate(usuario).model_dump()
