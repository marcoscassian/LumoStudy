import os
import unittest
from unittest.mock import patch

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from models.models import Area, Prova, Questao, RespostaUsuario, Usuarios
with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}):
    from routes.trilha_routes import obter_progresso


class TrilhaTaxaAcertosTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

        self.usuario = Usuarios(nome="Estudante", email="estudante@example.com", senha_hash="teste")
        outro_usuario = Usuarios(nome="Outro", email="outro@example.com", senha_hash="teste")
        area = Area(nome="Matemática", slug="matematica", ordem=1)
        prova = Prova(codigo="ENEM2013", nome="ENEM 2013", ano=2013)
        self.session.add_all([self.usuario, outro_usuario, area, prova])
        self.session.commit()
        for item in (self.usuario, outro_usuario, area, prova):
            self.session.refresh(item)

        questao = Questao(
            prova_id=prova.id,
            numero="1",
            area_id=area.id,
            caminho_json="ENEM2013/questions/1/details.json",
        )
        self.session.add(questao)
        self.session.commit()
        self.session.refresh(questao)
        self.questao_id = questao.id
        self.outro_usuario_id = outro_usuario.id

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_taxa_usa_apenas_as_respostas_do_usuario(self):
        self.assertEqual(obter_progresso(self.usuario, self.session)["taxa_acertos"], 0)

        for correta in (True, False, True):
            self.session.add(
                RespostaUsuario(
                    usuario_id=self.usuario.id,
                    questao_id=self.questao_id,
                    alternativa_escolhida="A",
                    correta=correta,
                )
            )
        self.session.add(
            RespostaUsuario(
                usuario_id=self.outro_usuario_id,
                questao_id=self.questao_id,
                alternativa_escolhida="B",
                correta=False,
            )
        )
        self.session.commit()

        self.assertEqual(obter_progresso(self.usuario, self.session)["taxa_acertos"], 67)


if __name__ == "__main__":
    unittest.main()
