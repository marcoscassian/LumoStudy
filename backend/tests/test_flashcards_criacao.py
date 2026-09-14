import unittest

from routes.flashcards_routes import FlashcardCreatePayload, MATERIAS_FLASHCARD


class FlashcardsCriacaoTest(unittest.TestCase):
    def test_materias_padrao_existem(self):
        self.assertEqual(len(MATERIAS_FLASHCARD), 4)
        self.assertIn("Linguagens", MATERIAS_FLASHCARD)
        self.assertIn("Ciências Humanas", MATERIAS_FLASHCARD)
        self.assertIn("Matemática", MATERIAS_FLASHCARD)
        self.assertIn("Ciências da Natureza", MATERIAS_FLASHCARD)

    def test_payload_aceita_materia_padrao_e_tema_customizado(self):
        payload = FlashcardCreatePayload(
            frente="O que é energia cinética?",
            verso="É a energia associada ao movimento de um corpo.",
            disciplina="Matemática",
            conteudo_principal="Trigonometria",
        )

        self.assertEqual(payload.disciplina, "Matemática")
        self.assertEqual(payload.conteudo_principal, "Trigonometria")


if __name__ == "__main__":
    unittest.main()
