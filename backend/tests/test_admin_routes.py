import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from pydantic import ValidationError
from sqlalchemy.dialects import mysql

from routes.admin_routes import (
    NotificacaoAdminPayload,
    QuestaoEditorialPayload,
    enviar_notificacao_admin,
    salvar_editorial,
)


class NotificacaoAdminPayloadTest(unittest.TestCase):
    def test_exige_destinatario_explicito(self):
        with self.assertRaises(ValidationError):
            NotificacaoAdminPayload(mensagem="Aviso")

    def test_aceita_usuario_especifico(self):
        payload = NotificacaoAdminPayload(usuario_id=12, mensagem="Aviso")

        self.assertEqual(payload.usuario_id, 12)
        self.assertFalse(payload.enviar_para_todos)

    def test_aceita_envio_para_todos_confirmado(self):
        payload = NotificacaoAdminPayload(enviar_para_todos=True, mensagem="Aviso")

        self.assertIsNone(payload.usuario_id)
        self.assertTrue(payload.enviar_para_todos)

    def test_rejeita_usuario_e_todos_ao_mesmo_tempo(self):
        with self.assertRaises(ValidationError):
            NotificacaoAdminPayload(
                usuario_id=12,
                enviar_para_todos=True,
                mensagem="Aviso",
            )

    def test_envio_para_todos_usa_insercao_em_massa(self):
        session = Mock()
        session.exec.return_value.one.return_value = 2

        resposta = enviar_notificacao_admin(
            NotificacaoAdminPayload(enviar_para_todos=True, mensagem="Aviso"),
            SimpleNamespace(id=7),
            session,
        )

        comando = session.execute.call_args.args[0]
        sql = str(comando.compile(dialect=mysql.dialect()))
        self.assertIn("INSERT INTO notificacoes", sql)
        self.assertIn("SELECT usuarios.id", sql)
        session.commit.assert_called_once_with()
        self.assertEqual(resposta["quantidade"], 2)


class SalvarEditorialTest(unittest.TestCase):
    @patch("routes.admin_routes._buscar_questao_db")
    @patch("routes.admin_routes._validar_questao_arquivo")
    @patch("routes.admin_routes._listar_provas", return_value=["ENEM2009"])
    def test_exclusao_da_resolucao_retorna_nulo(
        self,
        listar_provas,
        validar_questao,
        buscar_questao,
    ):
        editorial = SimpleNamespace()
        resolucao = SimpleNamespace(texto="Resolução antiga")
        resultado_editorial = Mock()
        resultado_editorial.first.return_value = editorial
        resultado_resolucao = Mock()
        resultado_resolucao.first.return_value = resolucao
        session = Mock()
        session.exec.side_effect = [resultado_editorial, resultado_resolucao]
        buscar_questao.return_value = SimpleNamespace(id=15)

        resposta = salvar_editorial(
            " enem2009 ",
            "15",
            QuestaoEditorialPayload(),
            SimpleNamespace(id=7),
            session,
        )

        validar_questao.assert_called_once_with("ENEM2009", "15")
        buscar_questao.assert_called_once_with(session, "ENEM2009", "15")
        session.delete.assert_called_once_with(resolucao)
        session.commit.assert_called_once_with()
        self.assertIsNone(resposta["resolucao"])


if __name__ == "__main__":
    unittest.main()
