import unittest

from main import get_cors_origins
from repositories.usuario_repository import UsuarioRepository
from schemas.usuario_schema import PerfilPublico, UsuarioCreate
from services.usuario_service import UsuarioService


class ArquiteturaBackendTest(unittest.TestCase):
    def test_camadas_existem(self):
        self.assertTrue(callable(UsuarioRepository))
        self.assertTrue(callable(UsuarioService))
        self.assertTrue(hasattr(UsuarioCreate, "model_validate"))
        self.assertTrue(hasattr(PerfilPublico, "model_validate"))

    def test_cors_aceita_portas_locais_padrao_das_interfaces_web(self):
        origens = get_cors_origins()
        self.assertIn("http://localhost:3000", origens)
        self.assertIn("http://localhost:5173", origens)
        self.assertIn("http://127.0.0.1:5173", origens)


if __name__ == "__main__":
    unittest.main()
