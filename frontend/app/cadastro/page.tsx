"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, Lock, Mail, UserPlus, UserRound } from "lucide-react";
import "../auth.css";
import { API_BASE, formatApiError } from "../lib/api";

export default function CadastroPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagem("");

    try {
      const response = await fetch(`${API_BASE}/usuarios/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: username.trim(),
          email: email.trim().toLowerCase(),
          senha_hash: password,
        }),
      });

      let data: { detail?: unknown } = {};
      try { data = await response.json(); } catch { data = {}; }

      if (response.ok) {
        setTipoMensagem("sucesso");
        setMensagem("Conta criada com sucesso!");
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
    <main className="auth-page auth-page--register">
      <Link href="/" className="brand">
        <Image src="/chapeu.png" alt="Logo do LumoStudy" className="logo" width={92} height={92} />
        <h1>LumoStudy</h1>
      </Link>

      <section className="auth-card register">
        <span className="badge">Nova conta</span>
        <h2>Crie sua conta</h2>
        <p>Crie seu perfil e comece sua trilha de estudos.</p>

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

          <label>Senha</label>
          <div className="input-box">
            <Lock size={16} />
            <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            <Eye size={16} onClick={() => setShowPassword(!showPassword)} style={{ cursor: "pointer" }} />
          </div>

          <button type="submit"><UserPlus size={17} />Criar conta</button>

          <div className="auth-back-link auth-back-link--compact">
            <Link href="/login">Já possui conta? Entrar</Link>
          </div>
        </form>
      </section>
    </main>
  );
}
