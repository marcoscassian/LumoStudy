"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, GraduationCap, Lock, Mail, UserPlus, UserRound } from "lucide-react";
import "../auth.css";
import { API_BASE, formatApiError } from "../lib/api";
import { CURSOS, type CursoSlug } from "../lib/identidade";

export default function CadastroPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [curso, setCurso] = useState<CursoSlug | "">("");
  const [showPassword, setShowPassword] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    if (!curso) {
      setTipoMensagem("erro");
      setMensagem("Selecione seu curso no IFRN Campus Caicó.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/usuarios/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: username.trim(),
          email: email.trim().toLowerCase(),
          senha_hash: password,
          curso,
        }),
      });

      let data: { detail?: unknown } = {};
      try { data = await response.json(); } catch { data = {}; }

      if (response.ok) {
        setTipoMensagem("sucesso");
        setMensagem("Conta criada! Sua casa e seu tema já estão definidos pelo curso.");
        setTimeout(() => router.push("/login"), 900);
      } else {
        setTipoMensagem("erro");
        setMensagem(formatApiError(data.detail, "Não foi possível criar a conta."));
      }
    } catch (err) {
      setTipoMensagem("erro");
      setMensagem(`Não foi possível conectar ao servidor em ${API_BASE}. Verifique se o backend está rodando.`);
      console.error("Cadastro fetch error:", err);
    }
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card register register--course">
        <span className="badge">Nova conta</span>
        <h2>Crie sua conta</h2>
        <p>Seu curso define sua casa, as cores do aplicativo e os avatares disponíveis.</p>

        {mensagem && <div className={`mensagem ${tipoMensagem}`}>{mensagem}</div>}

        <form onSubmit={handleRegister}>
          <label>Nome</label>
          <div className="input-box">
            <UserRound size={16} />
            <input type="text" placeholder="Seu nome" value={username} onChange={(e) => setUsername(e.target.value)} minLength={2} required />
          </div>

          <label>E-mail</label>
          <div className="input-box">
            <Mail size={16} />
            <input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <label>Curso no IFRN Campus Caicó</label>
          <div className="course-selector" role="radiogroup" aria-label="Curso">
            {CURSOS.map((opcao) => (
              <button
                type="button"
                key={opcao.slug}
                className={`course-option house-${opcao.casa} ${curso === opcao.slug ? "selected" : ""}`}
                onClick={() => setCurso(opcao.slug)}
                aria-pressed={curso === opcao.slug}
              >
                <GraduationCap size={18} />
                <span><strong>{opcao.nome}</strong><small>{opcao.casaNome}</small></span>
              </button>
            ))}
          </div>

          <label>Senha</label>
          <div className="input-box">
            <Lock size={16} />
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <Eye size={16} onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer" }} />
          </div>

          <button type="submit"><UserPlus size={17} />Criar conta</button>
        </form>
      </section>

      <p className="bottom-text">Já possui conta? <Link href="/login">Entrar</Link></p>
    </main>
  );
}
