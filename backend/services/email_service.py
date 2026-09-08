from __future__ import annotations

import os
import smtplib
import ssl
from email.message import EmailMessage
from urllib.parse import quote

from config_env import carregar_env

carregar_env()

EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "lumostudy934@gmail.com")
# O Google costuma exibir a senha de app em blocos. Remover espaços evita erro.
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "").replace(" ", "")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "LumoStudy")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
RESET_TOKEN_MINUTES = int(os.getenv("RESET_TOKEN_MINUTES", "30"))


def email_configurado() -> bool:
    return bool(EMAIL_USER and EMAIL_PASSWORD)


def enviar_email_recuperacao(destinatario: str, nome: str, token: str) -> None:
    if not email_configurado():
        raise RuntimeError(
            "EMAIL_PASSWORD não configurada. Coloque a senha de app do Google em backend/.env."
        )

    link = f"{FRONTEND_URL}/redefinir-senha?token={quote(token)}"

    msg = EmailMessage()
    msg["Subject"] = "Redefinição de senha - LumoStudy"
    msg["From"] = f"{EMAIL_FROM_NAME} <{EMAIL_USER}>"
    msg["To"] = destinatario
    msg.set_content(
        f"Olá, {nome}.\n\n"
        "Recebemos uma solicitação para redefinir a senha da sua conta no LumoStudy.\n\n"
        f"Abra este link: {link}\n\n"
        f"O link expira em {RESET_TOKEN_MINUTES} minutos e só pode ser usado uma vez.\n"
        "Se você não solicitou a alteração, ignore este e-mail.\n"
    )
    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;color:#211b2d">
        <div style="max-width:560px;margin:auto;padding:28px">
          <h2 style="color:#6e42f5">LumoStudy</h2>
          <p>Olá, <strong>{nome}</strong>.</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p style="margin:28px 0">
            <a href="{link}" style="background:#6e42f5;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">
              Redefinir minha senha
            </a>
          </p>
          <p>Este link expira em {RESET_TOKEN_MINUTES} minutos e só pode ser usado uma vez.</p>
          <p style="color:#777">Se você não solicitou a alteração, ignore este e-mail.</p>
        </div>
      </body>
    </html>
    """
    msg.add_alternative(html, subtype="html")

    contexto = ssl.create_default_context()
    with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=20) as smtp:
        smtp.ehlo()
        smtp.starttls(context=contexto)
        smtp.ehlo()
        smtp.login(EMAIL_USER, EMAIL_PASSWORD)
        smtp.send_message(msg)
