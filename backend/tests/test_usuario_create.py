import unittest

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from repositories.usuario_repository import UsuarioRepository
from schemas.usuario_schema import UsuarioCreate
from services.usuario_service import UsuarioService


class UsuarioCreateTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_criar_usuario_sem_curso_usa_default(self):
        repo = UsuarioRepository(self.session)
        service = UsuarioService(repo)

        usuario = service.criar_usuario(
            UsuarioCreate(
                nome="Aluno Teste",
                email="aluno@example.com",
                senha_hash="senha123",
            )
        )

        self.assertFalse(hasattr(usuario, "curso"))
        self.assertEqual(usuario.casa, "grifinoria")


if __name__ == "__main__":
    unittest.main()
