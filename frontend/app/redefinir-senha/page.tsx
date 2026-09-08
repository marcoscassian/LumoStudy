"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Lock, Save } from "lucide-react";
import "../auth.css";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function RedefinirSenhaPage() {
  const [token, setToken] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipo, setTipo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  async function redefinir(e: React.FormEvent) {
    e.preventDefault();
    setMensagem("");

    if (!token) {
      setTipo("erro");
      setMensagem("O link de recuperação está incompleto ou inválido.");
      return;
    }
    if (senha.length < 6) {
      setTipo("erro");
      setMensagem("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setTipo("erro");
      setMensagem("As duas senhas não são iguais.");
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch(`${API_BASE}/login/redefinir-senha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha: senha }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTipo("erro");
        setMensagem(data.detail || "Não foi possível alterar a senha.");
        return;
      }

      setTipo("sucesso");
      setMensagem(data.mensagem || "Senha alterada com sucesso.");
      setConcluido(true);
      setSenha("");
      setConfirmacao("");
    } catch {
      setTipo("erro");
      setMensagem(`Não foi possível conectar ao servidor em ${API_BASE}.`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card">
        <span className="badge">Nova senha</span>
        <h2>Redefinir senha</h2>
        <p>Escolha uma nova senha para sua conta do LumoStudy.</p>

        {mensagem && <div className={`mensagem ${tipo}`}>{mensagem}</div>}

        {!concluido ? (
          <form onSubmit={redefinir}>
            <label>Nova senha</label>
            <div className="input-box">
              <Lock size={16} />
              <input
                type={mostrar ? "text" : "password"}
                placeholder="Mínimo de 6 caracteres"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <Eye size={16} onClick={() => setMostrar(!mostrar)} style={{ cursor: "pointer" }} />
            </div>

            <label>Confirmar nova senha</label>
            <div className="input-box">
              <Lock size={16} />
              <input
                type={mostrar ? "text" : "password"}
                placeholder="Digite novamente"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={salvando}>
              <Save size={17} />
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        ) : (
          <Link className="auth-success-button" href="/login">Entrar com a nova senha</Link>
        )}

        <div className="auth-back-link">
          <Link href="/login"><ArrowLeft size={15} /> Voltar para o login</Link>
        </div>
      </section>
    </main>
  );
}
