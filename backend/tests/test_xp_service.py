import unittest

from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, SQLModel, create_engine

from models.models import (
    Area,
    Prova,
    Questao,
    RespostaUsuario,
    TentativaBloco,
    Usuarios,
)
from services.xp_service import (
    calcular_progressao,
    processar_xp_atividade,
    progressao_usuario,
)


class XpServiceTest(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self.session = Session(self.engine)

        self.usuario = Usuarios(
            nome="Estudante",
            email="xp@example.com",
            senha_hash="teste",
        )
        area = Area(nome="Matemática", slug="matematica", ordem=1)
        prova = Prova(codigo="ENEM-XP", nome="ENEM XP", ano=2025)
        self.session.add_all([self.usuario, area, prova])
        self.session.commit()
        for item in (self.usuario, area, prova):
            self.session.refresh(item)

        self.questoes = [
            Questao(
                prova_id=prova.id,
                numero=str(numero),
                area_id=area.id,
                caminho_json=f"ENEM-XP/questions/{numero}/details.json",
            )
            for numero in (1, 2)
        ]
        self.tentativa = TentativaBloco(
            usuario_id=self.usuario.id,
            area="matematica",
            total_questoes=2,
            finalizada=True,
        )
        self.session.add_all([*self.questoes, self.tentativa])
        self.session.commit()
        for item in (*self.questoes, self.tentativa):
            self.session.refresh(item)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_cada_resposta_vale_dez_xp_independentemente_do_acerto(self):
        self.session.add_all(
            [
                RespostaUsuario(
                    usuario_id=self.usuario.id,
                    questao_id=questao.id,
                    tentativa_bloco_id=self.tentativa.id,
                    alternativa_escolhida="A",
                    correta=correta,
                )
                for questao, correta in zip(self.questoes, (True, False), strict=True)
            ]
        )
        self.session.commit()

        resultado = processar_xp_atividade(
            self.session,
            self.usuario.id,
            self.tentativa,
        )
        self.session.commit()
        self.session.refresh(self.usuario)

        self.assertEqual(resultado["xp_ganhos"], 20)
        self.assertEqual(resultado["questoes_contabilizadas"], 2)
        self.assertEqual(self.usuario.xp, 20)
        self.assertEqual(progressao_usuario(self.session, self.usuario)["questoes_contabilizadas"], 2)

    def test_processamento_repetido_nao_duplica_xp(self):
        self.session.add(
            RespostaUsuario(
                usuario_id=self.usuario.id,
                questao_id=self.questoes[0].id,
                tentativa_bloco_id=self.tentativa.id,
                alternativa_escolhida="B",
                correta=False,
            )
        )
        self.session.commit()

        primeiro = processar_xp_atividade(self.session, self.usuario.id, self.tentativa)
        self.session.commit()
        segundo = processar_xp_atividade(self.session, self.usuario.id, self.tentativa)
        self.session.commit()
        self.session.refresh(self.usuario)

        self.assertEqual(primeiro["xp_ganhos"], 10)
        self.assertEqual(segundo["xp_ganhos"], 0)
        self.assertTrue(segundo["ja_processado"])
        self.assertEqual(self.usuario.xp, 10)

    def test_atividade_nao_finalizada_nao_concede_xp(self):
        self.tentativa.finalizada = False
        self.session.add(self.tentativa)
        self.session.commit()

        with self.assertRaisesRegex(ValueError, "atividade ser finalizada"):
            processar_xp_atividade(self.session, self.usuario.id, self.tentativa)

        self.session.refresh(self.usuario)
        self.assertEqual(self.usuario.xp, 0)

    def test_banco_impede_resposta_duplicada_na_mesma_atividade(self):
        resposta = {
            "usuario_id": self.usuario.id,
            "questao_id": self.questoes[0].id,
            "tentativa_bloco_id": self.tentativa.id,
            "alternativa_escolhida": "C",
            "correta": True,
        }
        self.session.add(RespostaUsuario(**resposta))
        self.session.commit()
        self.session.add(RespostaUsuario(**resposta))

        with self.assertRaises(IntegrityError):
            self.session.commit()
        self.session.rollback()

    def test_limites_dos_niveis_e_percentual_por_faixa(self):
        nivel_inicial = calcular_progressao(0)
        nivel_intermediario = calcular_progressao(500)
        nivel_exemplo = calcular_progressao(3_840)
        nivel_maximo = calcular_progressao(20_000)

        self.assertEqual(nivel_inicial["nome_nivel_atual"], "Trouxa")
        self.assertEqual(nivel_inicial["xp_restante"], 250)
        self.assertEqual(nivel_intermediario["nome_nivel_atual"], "Calouro de Magia")
        self.assertEqual(nivel_intermediario["progresso_percentual"], 50.0)
        self.assertEqual(nivel_exemplo["nome_nivel_atual"], "Bruxo Experiente")
        self.assertEqual(nivel_exemplo["xp_na_faixa"], 840)
        self.assertEqual(nivel_exemplo["xp_total_faixa"], 2_000)
        self.assertEqual(nivel_exemplo["xp_restante"], 1_160)
        self.assertEqual(nivel_exemplo["questoes_restantes"], 116)
        self.assertEqual(nivel_exemplo["progresso_percentual"], 42.0)
        self.assertEqual(nivel_maximo["nome_nivel_atual"], "Lenda do Mundo Bruxo")
        self.assertTrue(nivel_maximo["nivel_maximo"])
        self.assertEqual(nivel_maximo["progresso_percentual"], 100.0)
        self.assertIsNone(nivel_maximo["numero_proximo_nivel"])
        self.assertEqual(nivel_maximo["questoes_restantes"], 0)


if __name__ == "__main__":
    unittest.main()
