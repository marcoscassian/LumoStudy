import unittest

from repositories.usuario_repository import UsuarioRepository
from schemas.usuario_schema import PerfilPublico, UsuarioCreate
from services.usuario_service import UsuarioService


class ArquiteturaBackendTest(unittest.TestCase):
    def test_camadas_existem(self):
        self.assertTrue(callable(UsuarioRepository))
        self.assertTrue(callable(UsuarioService))
        self.assertTrue(hasattr(UsuarioCreate, "model_validate"))
        self.assertTrue(hasattr(PerfilPublico, "model_validate"))


if __name__ == "__main__":
    unittest.main()
