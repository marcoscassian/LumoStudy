"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import "../auth.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function solicitar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMensagem("");

    try {
      const response = await fetch(`${API_BASE}/login/esqueci-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTipo("erro");
        setMensagem(data.detail || "Não foi possível enviar o e-mail.");
        return;
      }

      setTipo("sucesso");
      setMensagem(
        data.mensagem ||
          "Se existir uma conta com esse e-mail, enviaremos um link para redefinir a senha."
      );
    } catch {
      setTipo("erro");
      setMensagem(`Não foi possível conectar ao servidor em ${API_BASE}.`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card">
        <span className="badge">Recuperação de senha</span>
        <h2>Esqueceu sua senha?</h2>
        <p>Digite o e-mail da sua conta. Enviaremos um link de uso único para criar uma nova senha.</p>

        {mensagem && <div className={`mensagem ${tipo}`}>{mensagem}</div>}

        <form onSubmit={solicitar}>
          <label>E-mail</label>
          <div className="input-box">
            <Mail size={16} />
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={enviando}>
            <Send size={17} />
            {enviando ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>

        <div className="auth-back-link">
          <Link href="/login"><ArrowLeft size={15} /> Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
