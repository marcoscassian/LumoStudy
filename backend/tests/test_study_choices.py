import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}):
    from routes import cronograma_routes, questoes_routes


class StudyChoicesTest(unittest.TestCase):
    def test_blocos_aceitam_apenas_as_quatro_quantidades(self):
        itens = [{"prova": "ENEM2020", "index": str(numero)} for numero in range(1, 31)]
        with patch.object(questoes_routes, "_questoes_da_area", return_value=itens), patch.object(
            questoes_routes, "_montar_questao_publica", side_effect=lambda prova, index, session: {"index": index}
        ):
            for quantidade in (5, 10, 15, 20):
                with self.subTest(quantidade=quantidade):
                    resposta = questoes_routes.gerar_questoes("matematica", quantidade, object())
                    self.assertEqual(resposta["quantidade"], quantidade)
                    self.assertEqual(len(resposta["questoes"]), quantidade)
                    self.assertNotIn("nivel", resposta)

            with self.assertRaises(HTTPException) as erro:
                questoes_routes.gerar_questoes("matematica", 25, object())
            self.assertEqual(erro.exception.status_code, 400)

    def test_cronograma_abre_a_escolha_e_limpa_atividades_antigas(self):
        area = SimpleNamespace(id=1, slug="matematica", nome="Matemática")
        bloco = cronograma_routes._bloco_questoes({"id": 1, "slug": area.slug, "nome": area.nome}, 90)
        self.assertEqual(bloco["quantidade"], 20)
        self.assertEqual(bloco["rota"], "/trilha?area=matematica&quantidade=20")
        self.assertNotIn("nível", bloco["descricao"])

        atividade_antiga = SimpleNamespace(
            id=7,
            periodo="tarde",
            tipo="questoes",
            area_id=1,
            titulo="Questões de Matemática",
            descricao="Resolva 25 questões fáceis, médias e difíceis.",
            duracao_minutos=90,
            quantidade=25,
            rota="/trilha/sessao?area=matematica&quantidade=25&nivel=misto",
            concluida=True,
        )
        resposta = cronograma_routes._serializar_atividade(atividade_antiga, {1: area})
        self.assertEqual(resposta["quantidade"], 20)
        self.assertEqual(resposta["rota"], bloco["rota"])
        self.assertNotIn("difíceis", resposta["descricao"])
        self.assertTrue(resposta["concluida"])

        revisao_antiga = SimpleNamespace(
            **{**atividade_antiga.__dict__, "tipo": "flashcards", "quantidade": None,
               "descricao": "Revise os cartões mais difíceis.", "rota": "/flashcards"}
        )
        resposta_revisao = cronograma_routes._serializar_atividade(revisao_antiga, {1: area})
        self.assertIn("precisam de mais revisão", resposta_revisao["descricao"])
        self.assertNotIn("difíceis", resposta_revisao["descricao"])


if __name__ == "__main__":
    unittest.main()
