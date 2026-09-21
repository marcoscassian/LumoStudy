"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, LogIn } from "lucide-react";
import "../auth.css";
import { aplicarTema } from "../components/theme-provider";
import { API_BASE, formatApiError } from "../lib/api";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData();

    formData.append("username", email.trim().toLowerCase());
    formData.append("password", password);

    try {
      const response = await fetch(`${API_BASE}/login/`, {
        method: "POST",
        body: formData,
      });

      // If server returned non-JSON (e.g. HTML error), guard against parse errors
      let data: {
        access_token?: string;
        detail?: unknown;
        modo_escuro?: boolean;
        casa?: string;
        tema_roxo_padrao?: boolean;
        avatar_url?: string;
      } = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (response.ok && data.access_token) {
        setTipoMensagem("sucesso");
        localStorage.setItem("token", data.access_token);
        aplicarTema(
          Boolean(data.modo_escuro),
          data.casa || undefined,
          Boolean(data.tema_roxo_padrao),
          data.avatar_url || "/avatar.png"
        );
        router.push(nextUrl || "/trilha");
      } else {
        setTipoMensagem("erro");
        setMensagem(
          formatApiError(data.detail, "E-mail ou senha inválidos.")
        );
      }
    } catch (err) {
      // Network or CORS error
      setTipoMensagem("erro");
      setMensagem(
        `Não foi possível conectar ao servidor em ${API_BASE}. Verifique se o backend está rodando.`
      );
      console.error("Login fetch error:", err);
    }
  }

  return (
    <main className="auth-page">
      <div className="brand">
        <img src="/chapeu.png" alt="Logo" className="logo" />
        <h1>LumoStudy</h1>
      </div>

      <section className="auth-card">
        <span className="badge">Acesso seguro</span>

        <h2>Bem-vindo de volta</h2>
        <p>Entre com suas credenciais para acessar o site.</p>

        {mensagem && (
          <div className={`mensagem ${tipoMensagem}`}>
            {mensagem}
          </div>
        )}

        <form onSubmit={handleLogin}>
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

          <label>Senha</label>

          <div className="input-box">
            <Lock size={16} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Eye
              size={16}
              onClick={() => setShowPassword(!showPassword)}
              style={{ cursor: "pointer" }}
            />
          </div>

          <div className="auth-link-row">
            <Link href="/esqueci-senha">Esqueci minha senha</Link>
          </div>

          <button type="submit">
            <LogIn size={17} />
            Entrar na conta
          </button>
        </form>

        <div className="auth-back-link">
          <Link href="/cadastro">Criar minha conta</Link>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}